# Genomic Alignment Pipeline

A flexible and scalable genomic alignment pipeline implemented in both Nextflow and Snakemake for processing next-generation sequencing data.

## Overview

This repository contains a comprehensive genomic data processing pipeline that performs:

1. Quality control of raw reads
2. Adapter trimming
3. Read alignment to a reference genome
4. Duplicate marking
5. Base quality score recalibration
6. Variant calling and filtering

The pipeline is implemented in two popular workflow management systems:
- **Nextflow**: For cloud-native and distributed computing environments
- **Snakemake**: For more traditional HPC and local execution

## Directory Structure

```
.
├── config.yaml                  # Snakemake configuration
├── data/                        # Input data directory
├── Dockerfile                   # Docker container definition
├── environment.yml              # Conda environment specification
├── logs/                        # Log files directory
├── main.nf                      # Nextflow main script
├── nextflow.config              # Nextflow configuration
├── README.md                    # This documentation file
├── reference/                   # Reference genome directory
├── results/                     # Output directory
├── run_pipeline.sh              # Execution script for both pipelines
├── Snakefile                    # Snakemake workflow file
└── utils/                       # Utility scripts
    └── generate_config.py       # Config generator script
```

## Installation

### Option 1: Using Conda

```bash
# Clone this repository
git clone https://github.com/yourusername/genomic-alignment-pipeline.git
cd genomic-alignment-pipeline

# Create and activate the conda environment
conda env create -f environment.yml
conda activate genomics-alignment
```

### Option 2: Using Docker

```bash
# Build the Docker image
docker build -t genomics-pipeline .

# Run the container
docker run -v $(pwd)/data:/pipeline/data -v $(pwd)/results:/pipeline/results genomics-pipeline
```

## Usage

### Preparing Your Data

1. Place your input FASTQ files in the `data/` directory
2. Place your reference genome in the `reference/` directory
3. Generate a configuration file:

```bash
python utils/generate_config.py --data_dir data/ --ref_genome reference/genome.fasta
```

### Running the Pipeline with Nextflow

```bash
# Basic execution
./run_pipeline.sh --pipeline nextflow

# With specific configuration
./run_pipeline.sh --pipeline nextflow --config custom_nextflow.config

# Run on a cluster with a specific profile
./run_pipeline.sh --pipeline nextflow --profile slurm
```

### Running the Pipeline with Snakemake

```bash
# Basic execution
./run_pipeline.sh --pipeline snakemake --config config.yaml

# Dry run to see what would be executed
./run_pipeline.sh --pipeline snakemake --config config.yaml --dry-run

# Run with specific number of cores
./run_pipeline.sh --pipeline snakemake --config config.yaml --threads 16
```

## Pipeline Steps

1. **Quality Control**: FastQC is used to assess the quality of the input reads
2. **Adapter Trimming**: Trimmomatic removes adapter sequences and low-quality bases
3. **Alignment**: BWA-MEM aligns the reads to the reference genome
4. **Mark Duplicates**: Picard identifies and marks duplicate reads
5. **Base Quality Score Recalibration**: GATK improves base quality scores
6. **Variant Calling**: GATK HaplotypeCaller identifies genomic variants
7. **Variant Filtering**: Low-quality variants are filtered out

## Customization

### Modifying the Nextflow Pipeline

Edit `main.nf` to add or remove processing steps. Configuration parameters can be adjusted in `nextflow.config`.

### Modifying the Snakemake Pipeline

Edit `Snakefile` to add or remove rules. Configuration parameters can be adjusted in `config.yaml`.

## Resource Requirements

- **CPU**: Minimum 4 cores recommended, 8+ for production use
- **Memory**: Minimum 16GB recommended, 32GB+ for whole genome analysis
- **Storage**: Depends on input data, but typically 10x the size of input FASTQ files

## Examples

### Example 1: Basic Analysis of Bacterial Genome

```bash
# Generate config
python utils/generate_config.py --data_dir examples/bacteria/ --ref_genome reference/ecoli.fasta

# Run pipeline
./run_pipeline.sh --pipeline nextflow
```

### Example 2: Human Exome Analysis on HPC

```bash
# Generate config
python utils/generate_config.py --data_dir examples/exome/ --ref_genome reference/hg38.fasta

# Run on SLURM cluster
./run_pipeline.sh --pipeline nextflow --profile slurm --threads 32
```

## Troubleshooting

- **Insufficient memory errors**: Adjust the memory parameters in your configuration
- **Missing reference genome indices**: They will be automatically created on first run
- **Tool execution errors**: Check the logs directory for detailed error messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Citation

If you use this pipeline in your work, please cite:

```
Your Name. (2025). Genomic Alignment Pipeline. GitHub: https://github.com/yourusername/genomic-alignment-pipeline
```

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request.