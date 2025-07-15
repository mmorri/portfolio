# CUDA-Demux

**CUDA-Demux** is an open-source tool for demultiplexing Illumina BCL files into FASTQ format, optimized with CUDA for GPU acceleration.

## Features
- Fast barcode matching using CUDA.
- Multi-threaded BCL parsing.
- High-speed FASTQ generation.

## Repository
The code is hosted on GitHub at: [https://github.com/mmorri/cuda-demux](https://github.com/mmorri/cuda-demux).

## Installation
### Prerequisites
- NVIDIA GPU with CUDA support
- CUDA Toolkit 11.0 or later
- CMake 3.16 or later
- A C++17-compatible compiler

### CUDA Setup
Before building, check your system for an NVIDIA GPU and install CUDA if needed:

```bash
python3 install_cuda.py
```

If no NVIDIA GPU is detected, CUDA cannot be installed and this project will not run.

### Troubleshooting
- If you encounter CUDA-related errors during build, ensure your GPU is NVIDIA and CUDA Toolkit is installed and on your PATH.
- On macOS: CUDA is only supported on older Intel Macs with NVIDIA GPUs. Apple Silicon and most modern Macs are not supported.
- On Linux: Prefer the official NVIDIA CUDA repository for drivers/toolkit.
- On Windows: Run the CUDA installer as administrator.

### Build Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/mmorri/cuda-demux.git
   cd cuda-demux
2. Create a build directory and navigate into it:
   ```bash
   mkdir build
   cd build
3. Run CMake to configure the project
   ```bash
   cmake ...
4. Compile the tool
   ```bash
   make
5. verify the binary is created
   ```bash
   ls cuda-demux

## USAGE

```bash
./cuda-demux --input <BCL_FOLDER> --samplesheet <SAMPLESHEET.CSV> --output <OUTPUT_FOLDER>

### Arguments

- --input: Path to the directory containing .bcl files (raw sequencing data).
- --samplesheet: Path to the CSV file mapping barcodes to sample IDs.
- --output: Path to the directory where FASTQ files will be generated.





