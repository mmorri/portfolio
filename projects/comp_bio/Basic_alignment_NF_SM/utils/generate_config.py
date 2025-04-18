#!/usr/bin/env python3
"""
Generate configuration files for genomic alignment pipeline based on input data.
This script scans a directory for FASTQ files and automatically creates config files.
"""

import os
import sys
import glob
import yaml
import argparse
from pathlib import Path
import json
import re


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Generate configuration files for genomic alignment pipeline.")
    parser.add_argument("--data_dir", required=True, help="Directory containing FASTQ files")
    parser.add_argument("--ref_genome", required=True, help="Path to reference genome FASTA file")
    parser.add_argument("--known_variants", required=False, help="Path to known variants VCF file")
    parser.add_argument("--output", default="config.yaml", help="Output config file name")
    parser.add_argument("--adapter", default="adapter/TruSeq3-PE.fa", help="Path to adapter sequences")
    parser.add_argument("--pipeline", choices=["nextflow", "snakemake", "both"], default="both", 
                        help="Generate config for Nextflow, Snakemake, or both")
    parser.add_argument("--threads", type=int, default=8, help="Default number of threads")
    parser.add_argument("--memory", type=int, default=16, help="Default memory in GB")
    parser.add_argument("--create_dirs", action="store_true", help="Create output directories")
    parser.add_argument("--prefix", default="", help="Prefix for output files")
    
    return parser.parse_args()


def find_fastq_pairs(data_dir):
    """Find FASTQ file pairs in the directory."""
    samples = {}
    
    # Normalize paths
    data_dir = os.path.abspath(data_dir)
    
    # Find all fastq files
    fastq_files = glob.glob(os.path.join(data_dir, "*.fastq.gz"))
    fastq_files.extend(glob.glob(os.path.join(data_dir, "*.fq.gz")))
    fastq_files.extend(glob.glob(os.path.join(data_dir, "*/*.fastq.gz")))
    fastq_files.extend(glob.glob(os.path.join(data_dir, "*/*.fq.gz")))
    
    # Detect patterns for paired-end reads
    patterns = [
        # Standard Illumina pattern: sample_S1_L001_R1_001.fastq.gz
        r'(.+)_S\d+_L\d+_R([12])_001\.f(ast)?q\.gz$',
        # Simple R1/R2 pattern: sample_R1.fastq.gz
        r'(.+)_R([12])\.f(ast)?q\.gz$',
        # Numbered pattern: sample_1.fastq.gz
        r'(.+)_([12])\.f(ast)?q\.gz$',
        # Variations with extra fields: sample_extra_R1.fastq.gz
        r'(.+)_R([12])_.+\.f(ast)?q\.gz$',
        # Lane specific: sample_L001_1.fastq.gz
        r'(.+)_L\d+_([12])\.f(ast)?q\.gz$'
    ]
    
    # Try to match files to patterns
    matched_files = set()
    
    for pattern in patterns:
        for fastq in fastq_files:
            # Skip already matched files
            if fastq in matched_files:
                continue
                
            basename = os.path.basename(fastq)
            match = re.match(pattern, basename)
            
            if match:
                sample_name = match.group(1)
                read_number = match.group(2)
                
                if sample_name not in samples:
                    samples[sample_name] = {"R1": None, "R2": None}
                
                samples[sample_name][f"R{read_number}"] = fastq
                matched_files.add(fastq)
    
    # For unmatched files, try a more general approach
    for fastq in fastq_files:
        if fastq in matched_files:
            continue
            
        basename = os.path.basename(fastq)
        
        # Try to identify R1/R2 or _1/_2
        if "_R1" in basename or "_1" in basename or "_R1_" in basename:
            possible_name = basename.split("_R1")[0] if "_R1" in basename else basename.split("_1")[0]
            if possible_name not in samples:
                samples[possible_name] = {"R1": None, "R2": None}
            samples[possible_name]["R1"] = fastq
            matched_files.add(fastq)
        elif "_R2" in basename or "_2" in basename or "_R2_" in basename:
            possible_name = basename.split("_R2")[0] if "_R2" in basename else basename.split("_2")[0]
            if possible_name not in samples:
                samples[possible_name] = {"R1": None, "R2": None}
            samples[possible_name]["R2"] = fastq
            matched_files.add(fastq)
    
    # Validate paired-end reads
    valid_samples = {}
    for sample_name, reads in samples.items():
        if reads["R1"] is not None and reads["R2"] is not None:
            valid_samples[sample_name] = reads
        else:
            print(f"Warning: Sample {sample_name} does not have both R1 and R2 reads. Skipping.")
    
    return valid_samples


def generate_snakemake_config(samples, args):
    """Generate configuration for Snakemake pipeline."""
    config = {
        "samples": {},
        "reference": {
            "genome": args.ref_genome
        },
        "threads": {
            "fastqc": min(2, args.threads),
            "trimmomatic": args.threads,
            "bwa": args.threads,
            "samtools": min(4, args.threads),
            "gatk": min(4, args.threads)
        },
        "params": {
            "trimmomatic": {
                "adapter": args.adapter,
                "trimmer": "LEADING:3 TRAILING:3 SLIDINGWINDOW:4:15 MINLEN:36"
            },
            "bwa": {
                "mem_options": "-M"
            },
            "variant_filtering": {
                "filters": "--filter-name \"QD_filter\" --filter \"QD < 2.0\" "
                           "--filter-name \"FS_filter\" --filter \"FS > 60.0\" "
                           "--filter-name \"MQ_filter\" --filter \"MQ < 40.0\" "
                           "--filter-name \"SOR_filter\" --filter \"SOR > 3.0\" "
                           "--filter-name \"ReadPosRankSum_filter\" --filter \"ReadPosRankSum < -8.0\" "
                           "--filter-name \"MQRankSum_filter\" --filter \"MQRankSum < -12.5\""
            }
        },
        "output_dirs": {
            "fastqc": "results/fastqc",
            "trimmed": "results/trimmed",
            "aligned": "results/aligned",
            "dedup": "results/dedup",
            "variants": "results/variants",
            "filtered": "results/filtered",
            "qc": "results/qc"
        }
    }
    
    # Add known variants if provided
    if args.known_variants:
        config["reference"]["known_sites"] = args.known_variants
    
    # Add samples
    for sample_name, reads in samples.items():
        config["samples"][sample_name] = {
            "R1": reads["R1"],
            "R2": reads["R2"]
        }
    
    return config


def generate_nextflow_params(samples, args):
    """Generate parameters for Nextflow pipeline."""
    # Create a directory structure for reads
    if args.create_dirs:
        os.makedirs("data", exist_ok=True)
    
    # Prepare data directory listing
    data_listing = []
    for sample_name, reads in samples.items():
        r1_relative = os.path.relpath(reads["R1"])
        r2_relative = os.path.relpath(reads["R2"])
        data_listing.append(f"  - Sample: {sample_name}")
        data_listing.append(f"    R1: {r1_relative}")
        data_listing.append(f"    R2: {r2_relative}")
    
    # Create nextflow.config
    nextflow_config = f"""
// Generated by generate_config.py
// Date: {os.popen('date').read().strip()}

params {{
    // Input files and directories
    reads = "{args.data_dir}/*_{{1,2}}.fastq.gz"
    genome = "{args.ref_genome}"
    outdir = "results"
    
    // Resource allocation
    threads = {args.threads}
    memory = {args.memory}.GB
    
    // Tool parameters
    adapter = "{args.adapter}"
    
    // Samples detected:
    // {os.linesep.join(data_listing)}
}}

// Include main config
includeConfig 'nextflow.config'
"""
    return nextflow_config


def create_directory_structure(args):
    """Create the basic directory structure for the pipeline."""
    if not args.create_dirs:
        return
        
    dirs = [
        "data",
        "reference",
        "adapter",
        "results",
        "results/fastqc",
        "results/trimmed",
        "results/aligned",
        "results/dedup",
        "results/variants",
        "results/filtered",
        "results/qc",
        "logs"
    ]
    
    for directory in dirs:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")
    
    # Create adapter file if it doesn't exist
    adapter_file = args.adapter
    if not os.path.exists(adapter_file):
        adapter_dir = os.path.dirname(adapter_file)
        os.makedirs(adapter_dir, exist_ok=True)
        
        # Write a basic TruSeq3 adapter file
        with open(adapter_file, "w") as f:
            f.write("""
>PrefixPE/1
TACACTCTTTCCCTACACGACGCTCTTCCGATCT
>PrefixPE/2
GTGACTGGAGTTCAGACGTGTGCTCTTCCGATCT
>PE1
TACACTCTTTCCCTACACGACGCTCTTCCGATCT
>PE1_rc
AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGTA
>PE2
GTGACTGGAGTTCAGACGTGTGCTCTTCCGATCT
>PE2_rc
AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC
""")
        print(f"Created adapter file: {adapter_file}")


def create_run_script(args, samples):
    """Create a basic run script for the detected samples."""
    if not args.create_dirs:
        return
        
    script_path = "run_samples.sh"
    sample_names = list(samples.keys())
    
    with open(script_path, "w") as f:
        f.write(f"""#!/bin/bash
# Auto-generated script to run the genomic alignment pipeline
# Created by generate_config.py

# Detected samples: {", ".join(sample_names)}

# Set up environment
# Uncomment if using conda:
# conda activate genomics-alignment

""")
        
        if "nextflow" in args.pipeline or args.pipeline == "both":
            f.write(f"""
# Run Nextflow pipeline
echo "Running Nextflow pipeline..."
./run_pipeline.sh --pipeline nextflow --threads {args.threads}

""")
            
        if "snakemake" in args.pipeline or args.pipeline == "both":
            f.write(f"""
# Run Snakemake pipeline
echo "Running Snakemake pipeline..."
./run_pipeline.sh --pipeline snakemake --config {args.output} --threads {args.threads}

""")
            
        f.write("""
echo "Pipeline execution completed!"
""")
    
    # Make the script executable
    os.chmod(script_path, 0o755)
    print(f"Created run script: {script_path}")


def generate_sample_sheet(samples, args):
    """Generate a sample sheet for the pipeline."""
    if not args.create_dirs:
        return
        
    sheet_path = "sample_sheet.csv"
    
    with open(sheet_path, "w") as f:
        f.write("sample,r1,r2\n")
        for sample_name, reads in samples.items():
            r1_path = os.path.relpath(reads["R1"])
            r2_path = os.path.relpath(reads["R2"])
            f.write(f"{sample_name},{r1_path},{r2_path}\n")
    
    print(f"Created sample sheet: {sheet_path}")


def main():
    """Main function to generate configuration files."""
    args = parse_arguments()
    
    # Check if data directory exists
    if not os.path.isdir(args.data_dir):
        print(f"Error: Data directory {args.data_dir} does not exist.")
        sys.exit(1)
    
    # Check if reference genome exists
    if not os.path.isfile(args.ref_genome):
        print(f"Error: Reference genome file {args.ref_genome} does not exist.")
        sys.exit(1)
    
    # Create directory structure if requested
    create_directory_structure(args)
    
    # Find FASTQ file pairs
    print(f"Scanning {args.data_dir} for FASTQ files...")
    samples = find_fastq_pairs(args.data_dir)
    
    if not samples:
        print("Error: No valid paired-end FASTQ files found.")
        sys.exit(1)
    
    print(f"Found {len(samples)} samples with paired-end reads:")
    for sample_name, reads in samples.items():
        print(f"  - {sample_name}: {os.path.basename(reads['R1'])} and {os.path.basename(reads['R2'])}")
    
    # Generate configurations
    if args.pipeline in ["snakemake", "both"]:
        snakemake_config = generate_snakemake_config(samples, args)
        
        output_file = args.prefix + args.output if args.prefix else args.output
        with open(output_file, "w") as f:
            yaml.dump(snakemake_config, f, default_flow_style=False)
        
        print(f"Generated Snakemake configuration: {output_file}")
    
    if args.pipeline in ["nextflow", "both"]:
        nextflow_params = generate_nextflow_params(samples, args)
        
        output_file = args.prefix + "nextflow_params.config" if args.prefix else "nextflow_params.config"
        with open(output_file, "w") as f:
            f.write(nextflow_params)
        
        print(f"Generated Nextflow parameters: {output_file}")
    
    # Generate sample sheet
    generate_sample_sheet(samples, args)
    
    # Create run script
    create_run_script(args, samples)
    
    # Final messages
    print("\nConfiguration generation completed!")
    print("Next steps:")
    print("1. Review the generated configuration files")
    print("2. Run the pipeline using: ./run_pipeline.sh")
    print("   or use the auto-generated script: ./run_samples.sh")


if __name__ == "__main__":
    main()