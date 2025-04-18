#!/usr/bin/env nextflow

/*
 * Genomic Alignment Pipeline using Nextflow
 * This pipeline performs quality control, alignment, and variant calling on genomic data
 */

// Define parameters
params.reads = "$baseDir/data/*_{1,2}.fastq.gz"
params.genome = "$baseDir/reference/reference.fasta"
params.outdir = "$baseDir/results"
params.threads = 8
params.adapter = "$baseDir/adapter/TruSeq3-PE.fa"
params.help = false

// Show help message
if (params.help) {
    log.info """
    ===============================================
    Genomic Alignment Pipeline - Nextflow
    ===============================================
    Usage:
    nextflow run main.nf --reads 'path/to/reads/*_{1,2}.fastq.gz' --genome 'path/to/reference.fasta'
    
    Mandatory arguments:
      --reads             Path to input data (must be surrounded with quotes)
      --genome            Path to reference genome file
      
    Optional arguments:
      --outdir            Output directory (default: $params.outdir)
      --threads           Number of CPUs to use (default: $params.threads)
      --adapter           Path to adapter sequences for trimming (default: $params.adapter)
    """
    exit 0
}

// Log information
log.info """
=========================================
Genomic Alignment Pipeline
=========================================
reads        : ${params.reads}
genome       : ${params.genome}
outdir       : ${params.outdir}
threads      : ${params.threads}
adapter      : ${params.adapter}
"""

// Create channels
Channel
    .fromFilePairs(params.reads, checkIfExists: true)
    .ifEmpty { error "Cannot find any reads matching: ${params.reads}" }
    .set { read_pairs_ch }

// Step 1: Quality Control with FastQC
process fastqc {
    publishDir "${params.outdir}/fastqc", mode: 'copy'
    
    input:
    tuple val(sample_id), path(reads) from read_pairs_ch
    
    output:
    path("fastqc_${sample_id}_logs") into fastqc_ch
    
    script:
    """
    mkdir fastqc_${sample_id}_logs
    fastqc -o fastqc_${sample_id}_logs -q ${reads}
    """
}

// Step 2: Adapter Trimming with Trimmomatic
process trimmomatic {
    publishDir "${params.outdir}/trimmed", mode: 'copy'
    
    input:
    tuple val(sample_id), path(reads) from read_pairs_ch
    
    output:
    tuple val(sample_id), path("${sample_id}_trimmed_{1,2}.fastq.gz") into trimmed_reads_ch
    
    script:
    """
    trimmomatic PE -threads ${params.threads} \
        ${reads[0]} ${reads[1]} \
        ${sample_id}_trimmed_1.fastq.gz ${sample_id}_unpaired_1.fastq.gz \
        ${sample_id}_trimmed_2.fastq.gz ${sample_id}_unpaired_2.fastq.gz \
        ILLUMINACLIP:${params.adapter}:2:30:10 \
        LEADING:3 TRAILING:3 SLIDINGWINDOW:4:15 MINLEN:36
    """
}

// Step 3: Alignment with BWA
process bwa_align {
    publishDir "${params.outdir}/aligned", mode: 'copy'
    
    input:
    tuple val(sample_id), path(trimmed_reads) from trimmed_reads_ch
    path genome from file(params.genome)
    
    output:
    tuple val(sample_id), path("${sample_id}.bam") into bam_ch
    
    script:
    """
    # Index reference genome if index doesn't exist
    if [ ! -f ${genome}.bwt ]; then
        bwa index ${genome}
    fi
    
    # Perform alignment
    bwa mem -t ${params.threads} ${genome} ${trimmed_reads[0]} ${trimmed_reads[1]} | \
    samtools view -Sb - | \
    samtools sort -o ${sample_id}.bam -
    
    # Index BAM file
    samtools index ${sample_id}.bam
    """
}

// Step 4: Mark Duplicates with Picard
process mark_duplicates {
    publishDir "${params.outdir}/dedup", mode: 'copy'
    
    input:
    tuple val(sample_id), path(bam_file) from bam_ch
    
    output:
    tuple val(sample_id), path("${sample_id}.dedup.bam") into dedup_bam_ch
    path "${sample_id}.metrics.txt"
    
    script:
    """
    picard MarkDuplicates \
        INPUT=${bam_file} \
        OUTPUT=${sample_id}.dedup.bam \
        METRICS_FILE=${sample_id}.metrics.txt \
        CREATE_INDEX=true \
        VALIDATION_STRINGENCY=LENIENT
    """
}

// Step 5: Base Quality Score Recalibration (BQSR) with GATK
process bqsr {
    publishDir "${params.outdir}/bqsr", mode: 'copy'
    
    input:
    tuple val(sample_id), path(dedup_bam) from dedup_bam_ch
    path genome from file(params.genome)
    
    output:
    tuple val(sample_id), path("${sample_id}.recal.bam") into recal_bam_ch
    
    script:
    """
    # Create dict file if it doesn't exist
    if [ ! -f ${genome.baseName}.dict ]; then
        samtools dict ${genome} -o ${genome.baseName}.dict
    fi
    
    # Create fai file if it doesn't exist
    if [ ! -f ${genome}.fai ]; then
        samtools faidx ${genome}
    fi
    
    # Base recalibration
    gatk BaseRecalibrator \
        -I ${dedup_bam} \
        -R ${genome} \
        --known-sites ${params.outdir}/known_variants.vcf \
        -O ${sample_id}.recal.table
        
    gatk ApplyBQSR \
        -I ${dedup_bam} \
        -R ${genome} \
        --bqsr-recal-file ${sample_id}.recal.table \
        -O ${sample_id}.recal.bam
    """
}

// Step 6: Call Variants with GATK HaplotypeCaller
process call_variants {
    publishDir "${params.outdir}/variants", mode: 'copy'
    
    input:
    tuple val(sample_id), path(recal_bam) from recal_bam_ch
    path genome from file(params.genome)
    
    output:
    tuple val(sample_id), path("${sample_id}.vcf") into vcf_ch
    
    script:
    """
    gatk HaplotypeCaller \
        -R ${genome} \
        -I ${recal_bam} \
        -O ${sample_id}.vcf
    """
}

// Step 7: Filter Variants
process filter_variants {
    publishDir "${params.outdir}/filtered", mode: 'copy'
    
    input:
    tuple val(sample_id), path(vcf_file) from vcf_ch
    
    output:
    path "${sample_id}.filtered.vcf"
    
    script:
    """
    gatk VariantFiltration \
        -V ${vcf_file} \
        -filter "QD < 2.0" --filter-name "QD2" \
        -filter "QUAL < 30.0" --filter-name "QUAL30" \
        -filter "SOR > 3.0" --filter-name "SOR3" \
        -filter "FS > 60.0" --filter-name "FS60" \
        -filter "MQ < 40.0" --filter-name "MQ40" \
        -filter "MQRankSum < -12.5" --filter-name "MQRankSum-12.5" \
        -filter "ReadPosRankSum < -8.0" --filter-name "ReadPosRankSum-8" \
        -O ${sample_id}.filtered.vcf
    """
}

workflow.onComplete {
    log.info "Pipeline completed at: $workflow.complete"
    log.info "Execution status: ${ workflow.success ? 'OK' : 'failed' }"
    log.info "Execution duration: $workflow.duration"
}