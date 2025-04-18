#!/bin/bash
#
# Run Genomic Alignment Pipeline using either Nextflow or Snakemake
#

set -e

# Default values
PIPELINE="nextflow"
CONFIG=""
PROFILE="standard"
THREADS=$(nproc)
VERBOSE=false
DRY_RUN=false

# Print usage information
function print_usage {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -p, --pipeline <pipeline>  Pipeline to use: nextflow or snakemake (default: nextflow)"
    echo "  -c, --config <file>        Configuration file (required for snakemake)"
    echo "  --profile <profile>        Execution profile for nextflow (default: standard)"
    echo "  -t, --threads <num>        Number of threads to use (default: all available)"
    echo "  -v, --verbose              Enable verbose output"
    echo "  -d, --dry-run              Perform a dry run"
    echo "  -h, --help                 Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -p|--pipeline)
            PIPELINE="$2"
            shift 2
            ;;
        -c|--config)
            CONFIG="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        -t|--threads)
            THREADS="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            print_usage
            ;;
        *)
            echo "Unknown option: $1"
            print_usage
            ;;
    esac
done

# Check if the pipeline choice is valid
if [[ "$PIPELINE" != "nextflow" && "$PIPELINE" != "snakemake" ]]; then
    echo "Error: Pipeline must be either 'nextflow' or 'snakemake'"
    print_usage
fi

# For Snakemake, config file is required
if [[ "$PIPELINE" == "snakemake" && -z "$CONFIG" ]]; then
    echo "Error: Configuration file (-c/--config) is required for Snakemake"
    print_usage
fi

# Create log directory
mkdir -p logs

# Set timestamp for log file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="logs/pipeline_run_${TIMESTAMP}.log"

# Print selected options
echo "Running Genomic Alignment Pipeline with the following settings:"
echo "  Pipeline: $PIPELINE"
if [[ -n "$CONFIG" ]]; then
    echo "  Config file: $CONFIG"
fi
if [[ "$PIPELINE" == "nextflow" ]]; then
    echo "  Profile: $PROFILE"
fi
echo "  Threads: $THREADS"
echo "  Verbose: $VERBOSE"
echo "  Dry run: $DRY_RUN"
echo "  Log file: $LOG_FILE"
echo ""

# Function to run the pipeline with logging
function run_with_log {
    if $VERBOSE; then
        "$@" 2>&1 | tee -a "$LOG_FILE"
    else
        "$@" >> "$LOG_FILE" 2>&1
    fi
}

# Run the selected pipeline
if [[ "$PIPELINE" == "nextflow" ]]; then
    echo "Starting Nextflow pipeline..."
    
    # Build command
    CMD="nextflow run main.nf -profile $PROFILE -with-report -with-timeline"
    
    if [[ -n "$CONFIG" ]]; then
        CMD="$CMD -c $CONFIG"
    fi
    
    if [[ "$THREADS" -gt 0 ]]; then
        CMD="$CMD --threads $THREADS"
    fi
    
    if $DRY_RUN; then
        CMD="$CMD -preview"
    fi
    
    # Execute
    echo "Command: $CMD"
    if ! $DRY_RUN || $VERBOSE; then
        run_with_log $CMD
    fi
    
    echo "Nextflow pipeline completed. See $LOG_FILE for details."
    
elif [[ "$PIPELINE" == "snakemake" ]]; then
    echo "Starting Snakemake pipeline..."
    
    # Build command
    CMD="snakemake --configfile $CONFIG"
    
    if [[ "$THREADS" -gt 0 ]]; then
        CMD="$CMD --cores $THREADS"
    fi
    
    if $VERBOSE; then
        CMD="$CMD --verbose"
    fi
    
    if $DRY_RUN; then
        CMD="$CMD --dryrun"
    fi
    
    # Execute
    echo "Command: $CMD"
    if ! $DRY_RUN || $VERBOSE; then
        run_with_log $CMD
    fi
    
    echo "Snakemake pipeline completed. See $LOG_FILE for details."
fi

exit 0