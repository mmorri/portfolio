#!/usr/bin/env python3
"""
Generate a comprehensive quality report for aligned genomic data.
This script analyzes BAM files and variant calls to produce quality metrics.
"""

import os
import sys
import argparse
import subprocess
import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Generate quality report for aligned genomic data.")
    
    parser.add_argument("--bam_dir", required=True, help="Directory containing aligned BAM files")
    parser.add_argument("--vcf_dir", required=True, help="Directory containing VCF files")
    parser.add_argument("--output", default="quality_report.html", help="Output report filename")
    parser.add_argument("--sample_sheet", help="Sample sheet with metadata (CSV format)")
    parser.add_argument("--reference", help="Reference genome FASTA file")
    parser.add_argument("--threads", type=int, default=1, help="Number of threads for processing")
    
    return parser.parse_args()


def collect_bam_stats(bam_file, threads=1):
    """Collect statistics for a BAM file using samtools."""
    stats = {}
    
    # Get basic stats
    try:
        cmd = ["samtools", "flagstat", "-@", str(threads), bam_file]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        lines = result.stdout.strip().split("\n")
        stats["total_reads"] = int(lines[0].split()[0])
        stats["mapped_reads"] = int(lines[4].split()[0])
        stats["mapped_percentage"] = float(lines[4].split("(")[1].strip("%)"))
        stats["paired_reads"] = int(lines[9].split()[0])
        stats["properly_paired"] = int(lines[10].split()[0])
        
        # Get insert size stats if paired
        if stats["paired_reads"] > 0:
            cmd = ["samtools", "stats", "-@", str(threads), bam_file]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            for line in result.stdout.strip().split("\n"):
                if line.startswith("SN\taverage insert size"):
                    stats["avg_insert_size"] = float(line.split("\t")[2])
                if line.startswith("SN\tmaximum insert size"):
                    stats["max_insert_size"] = float(line.split("\t")[2])
                if line.startswith("SN\taverage quality"):
                    stats["avg_quality"] = float(line.split("\t")[2])
                if line.startswith("SN\taverage length"):
                    stats["avg_read_length"] = float(line.split("\t")[2])
        
        # Get depth stats
        cmd = ["samtools", "depth", "-a", bam_file]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        depths = []
        for line in result.stdout.strip().split("\n")[:100000]:  # Limit to avoid memory issues
            if line:
                fields = line.split("\t")
                depths.append(int(fields[2]))
        
        if depths:
            stats["avg_depth"] = sum(depths) / len(depths)
            stats["median_depth"] = sorted(depths)[len(depths) // 2]
            stats["min_depth"] = min(depths)
            stats["max_depth"] = max(depths)
        
    except subprocess.CalledProcessError as e:
        print(f"Error processing BAM file {bam_file}: {e}")
        stats["error"] = str(e)
    
    return stats


def collect_vcf_stats(vcf_file, reference=None, threads=1):
    """Collect statistics for a VCF file."""
    stats = {}
    
    try:
        # Get basic stats using bcftools
        cmd = ["bcftools", "stats", vcf_file]
        if reference:
            cmd.extend(["--fasta-ref", reference])
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        for line in result.stdout.strip().split("\n"):
            if line.startswith("SN\t0\tnumber of samples:"):
                stats["sample_count"] = int(line.split("\t")[3])
            elif line.startswith("SN\t0\tnumber of records:"):
                stats["variant_count"] = int(line.split("\t")[3])
            elif line.startswith("SN\t0\tnumber of SNPs:"):
                stats["snp_count"] = int(line.split("\t")[3])
            elif line.startswith("SN\t0\tnumber of indels:"):
                stats["indel_count"] = int(line.split("\t")[3])
            elif line.startswith("SN\t0\tnumber of MNPs:"):
                stats["mnp_count"] = int(line.split("\t")[3])
            elif line.startswith("TSTV\t0"):
                fields = line.split("\t")
                if len(fields) >= 5:
                    stats["ts_tv_ratio"] = float(fields[4])
        
        # Calculate additional metrics
        if "snp_count" in stats and "indel_count" in stats:
            total_variants = stats.get("snp_count", 0) + stats.get("indel_count", 0)
            if total_variants > 0:
                stats["snp_percentage"] = (stats.get("snp_count", 0) / total_variants) * 100
                stats["indel_percentage"] = (stats.get("indel_count", 0) / total_variants) * 100
        
        # Get additional info about variant quality
        cmd = ["bcftools", "query", "-f", "%QUAL\n", vcf_file]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        qualities = []
        for line in result.stdout.strip().split("\n"):
            if line and line != ".":
                qualities.append(float(line))
        
        if qualities:
            stats["min_quality"] = min(qualities)
            stats["max_quality"] = max(qualities)
            stats["avg_quality"] = sum(qualities) / len(qualities)
            stats["median_quality"] = sorted(qualities)[len(qualities) // 2]
        
    except subprocess.CalledProcessError as e:
        print(f"Error processing VCF file {vcf_file}: {e}")
        stats["error"] = str(e)
    
    return stats


def generate_html_report(bam_stats, vcf_stats, output_file, sample_sheet=None):
    """Generate an HTML report with the collected statistics."""
    # Create a directory for figures
    figure_dir = os.path.join(os.path.dirname(output_file), "figures")
    os.makedirs(figure_dir, exist_ok=True)
    
    # Prepare data for plotting
    bam_df = pd.DataFrame.from_dict(bam_stats, orient='index')
    vcf_df = pd.DataFrame.from_dict(vcf_stats, orient='index')
    
    # Load sample metadata if available
    sample_metadata = None
    if sample_sheet and os.path.exists(sample_sheet):
        try:
            sample_metadata = pd.read_csv(sample_sheet)
        except Exception as e:
            print(f"Error loading sample sheet: {e}")
    
    # Generate plots
    plot_paths = []
    
    # Mapping rate plot
    if 'mapped_percentage' in bam_df.columns:
        plt.figure(figsize=(10, 6))
        sns.barplot(x=bam_df.index, y='mapped_percentage', data=bam_df)
        plt.title('Mapping Rate by Sample')
        plt.xlabel('Sample')
        plt.ylabel('Mapping Rate (%)')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        mapping_plot = os.path.join(figure_dir, "mapping_rate.png")
        plt.savefig(mapping_plot)
        plt.close()
        plot_paths.append(("Mapping Rate", mapping_plot))
    
    # Coverage depth plot
    if 'avg_depth' in bam_df.columns:
        plt.figure(figsize=(10, 6))
        sns.barplot(x=bam_df.index, y='avg_depth', data=bam_df)
        plt.title('Average Coverage Depth by Sample')
        plt.xlabel('Sample')
        plt.ylabel('Average Depth')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        depth_plot = os.path.join(figure_dir, "coverage_depth.png")
        plt.savefig(depth_plot)
        plt.close()
        plot_paths.append(("Coverage Depth", depth_plot))
    
    # Variant count plot
    if 'variant_count' in vcf_df.columns:
        plt.figure(figsize=(10, 6))
        sns.barplot(x=vcf_df.index, y='variant_count', data=vcf_df)
        plt.title('Variant Count by Sample')
        plt.xlabel('Sample')
        plt.ylabel('Number of Variants')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        variant_plot = os.path.join(figure_dir, "variant_count.png")
        plt.savefig(variant_plot)
        plt.close()
        plot_paths.append(("Variant Count", variant_plot))
    
    # SNP vs Indel plot
    if 'snp_count' in vcf_df.columns and 'indel_count' in vcf_df.columns:
        plt.figure(figsize=(10, 6))
        
        # Prepare data for stacked bar chart
        snps = vcf_df['snp_count'].values
        indels = vcf_df['indel_count'].values
        
        # Define positions for bars
        positions = range(len(vcf_df))
        
        # Create stacked bar chart
        plt.bar(positions, snps, label='SNPs')
        plt.bar(positions, indels, bottom=snps, label='Indels')
        
        plt.title('SNPs vs Indels by Sample')
        plt.xlabel('Sample')
        plt.ylabel('Count')
        plt.xticks(positions, vcf_df.index, rotation=45, ha='right')
        plt.legend()
        plt.tight_layout()
        
        snp_indel_plot = os.path.join(figure_dir, "snp_vs_indel.png")
        plt.savefig(snp_indel_plot)
        plt.close()
        plot_paths.append(("SNPs vs Indels", snp_indel_plot))
    
    # Generate HTML content
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Genomic Alignment Quality Report</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                line-height: 1.6;
            }
            h1, h2, h3 {
                color: #333;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 20px;
            }
            th, td {
                text-align: left;
                padding: 8px;
                border: 1px solid #ddd;
            }
            th {
                background-color: #f2f2f2;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .figure {
                margin: 20px 0;
                text-align: center;
            }
            .figure img {
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
            }
            .caption {
                margin-top: 5px;
                font-style: italic;
                color: #666;
            }
            .summary {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .error {
                color: red;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <h1>Genomic Alignment Quality Report</h1>
        <p>Generated on: """ + subprocess.check_output(['date']).decode().strip() + """</p>
        
        <div class="summary">
            <h2>Summary</h2>
            <p>This report contains quality metrics for """ + str(len(bam_stats)) + """ samples.</p>
    """
    
    # Add overall statistics if we have data
    if bam_df.shape[0] > 0 and 'mapped_percentage' in bam_df.columns:
        html_content += f"""
            <p>Average mapping rate: {bam_df['mapped_percentage'].mean():.2f}%</p>
        """
    
    if vcf_df.shape[0] > 0 and 'variant_count' in vcf_df.columns:
        html_content += f"""
            <p>Average variant count: {vcf_df['variant_count'].mean():.0f}</p>
        """
    
    html_content += """
        </div>
        
        <h2>Alignment Statistics</h2>
        <table>
            <tr>
                <th>Sample</th>
                <th>Total Reads</th>
                <th>Mapped Reads</th>
                <th>Mapping Rate</th>
                <th>Average Depth</th>
                <th>Average Read Length</th>
            </tr>
    """
    
    # Add rows for alignment statistics
    for sample, stats in bam_stats.items():
        html_content += f"""
            <tr>
                <td>{sample}</td>
                <td>{stats.get('total_reads', 'N/A')}</td>
                <td>{stats.get('mapped_reads', 'N/A')}</td>
                <td>{stats.get('mapped_percentage', 'N/A'):.2f}%</td>
                <td>{stats.get('avg_depth', 'N/A'):.2f}</td>
                <td>{stats.get('avg_read_length', 'N/A'):.1f}</td>
            </tr>
        """
    
    html_content += """
        </table>
        
        <h2>Variant Statistics</h2>
        <table>
            <tr>
                <th>Sample</th>
                <th>Total Variants</th>
                <th>SNPs</th>
                <th>Indels</th>
                <th>Ts/Tv Ratio</th>
                <th>Average Quality</th>
            </tr>
    """
    
    # Add rows for variant statistics
    for sample, stats in vcf_stats.items():
        html_content += f"""
            <tr>
                <td>{sample}</td>
                <td>{stats.get('variant_count', 'N/A')}</td>
                <td>{stats.get('snp_count', 'N/A')}</td>
                <td>{stats.get('indel_count', 'N/A')}</td>
                <td>{stats.get('ts_tv_ratio', 'N/A'):.2f}</td>
                <td>{stats.get('avg_quality', 'N/A'):.2f}</td>
            </tr>
        """
    
    html_content += """
        </table>
    """
    
    # Add figures to the report
    if plot_paths:
        html_content += """
        <h2>Quality Metrics Visualizations</h2>
        """
        
        for title, plot_path in plot_paths:
            relative_path = os.path.relpath(plot_path, os.path.dirname(output_file))
            html_content += f"""
            <div class="figure">
                <h3>{title}</h3>
                <img src="{relative_path}" alt="{title}">
                <div class="caption">Figure: {title} for all samples</div>
            </div>
            """
    
    # Add sample metadata if available
    if sample_metadata is not None:
        html_content += """
        <h2>Sample Metadata</h2>
        <table>
            <tr>
        """
        
        # Add header row with metadata columns
        for column in sample_metadata.columns:
            html_content += f"<th>{column}</th>\n"
        
        html_content += """
            </tr>
        """
        
        # Add data rows
        for _, row in sample_metadata.iterrows():
            html_content += "<tr>\n"
            for value in row:
                html_content += f"<td>{value}</td>\n"
            html_content += "</tr>\n"
        
        html_content += """
        </table>
        """
    
    # Finish HTML
    html_content += """
        <h2>Methods</h2>
        <p>This report was generated using the following tools:</p>
        <ul>
            <li>samtools (for BAM file analysis)</li>
            <li>bcftools (for VCF file analysis)</li>
            <li>Python libraries: pandas, matplotlib, seaborn</li>
        </ul>
        <p>For questions or issues, please contact the pipeline maintainer.</p>
        
        <hr>
        <p><em>Report generated automatically by the Genomic Alignment Pipeline</em></p>
    </body>
    </html>
    """
    
    # Write HTML content to file
    with open(output_file, "w") as f:
        f.write(html_content)
    
    print(f"Generated HTML report: {output_file}")
    return output_file


def find_bam_files(bam_dir):
    """Find all BAM files in the specified directory."""
    bam_files = {}
    
    # Get all BAM files
    file_list = glob.glob(os.path.join(bam_dir, "*.bam"))
    
    # Extract sample names from filenames
    for bam_file in file_list:
        basename = os.path.basename(bam_file)
        sample_name = basename.split(".bam")[0]
        
        # Skip index files and other non-primary BAM files
        if basename.endswith(".bai") or ".bai." in basename or sample_name.endswith(".sorted"):
            continue
        
        # Remove common suffixes for cleaner sample names
        for suffix in [".sorted", ".dedup", ".realigned", ".recal"]:
            if sample_name.endswith(suffix):
                sample_name = sample_name[:-len(suffix)]
        
        bam_files[sample_name] = bam_file
    
    return bam_files


def find_vcf_files(vcf_dir):
    """Find all VCF files in the specified directory."""
    vcf_files = {}
    
    # Get all VCF files
    file_list = glob.glob(os.path.join(vcf_dir, "*.vcf*"))
    
    # Extract sample names from filenames
    for vcf_file in file_list:
        basename = os.path.basename(vcf_file)
        
        # Skip index files
        if basename.endswith(".tbi") or basename.endswith(".idx") or basename.endswith(".csi"):
            continue
        
        # Get sample name without extensions
        sample_name = basename.split(".vcf")[0]
        
        # Remove common suffixes for cleaner sample names
        for suffix in [".filtered", ".variants", ".final", ".ann"]:
            if sample_name.endswith(suffix):
                sample_name = sample_name[:-len(suffix)]
        
        vcf_files[sample_name] = vcf_file
    
    return vcf_files


def main():
    """Main function."""
    args = parse_arguments()
    
    # Check if directories exist
    if not os.path.isdir(args.bam_dir):
        print(f"Error: BAM directory {args.bam_dir} does not exist.")
        sys.exit(1)
    
    if not os.path.isdir(args.vcf_dir):
        print(f"Error: VCF directory {args.vcf_dir} does not exist.")
        sys.exit(1)
    
    # Find BAM and VCF files
    print("Scanning for BAM files...")
    bam_files = find_bam_files(args.bam_dir)
    
    print("Scanning for VCF files...")
    vcf_files = find_vcf_files(args.vcf_dir)
    
    if not bam_files:
        print(f"Warning: No BAM files found in {args.bam_dir}")
    else:
        print(f"Found {len(bam_files)} BAM files:")
        for sample, file_path in bam_files.items():
            print(f"  - {sample}: {os.path.basename(file_path)}")
    
    if not vcf_files:
        print(f"Warning: No VCF files found in {args.vcf_dir}")
    else:
        print(f"Found {len(vcf_files)} VCF files:")
        for sample, file_path in vcf_files.items():
            print(f"  - {sample}: {os.path.basename(file_path)}")
    
    # Collect statistics for each file
    bam_stats = {}
    vcf_stats = {}
    
    print("Collecting BAM statistics...")
    for sample, bam_file in bam_files.items():
        print(f"  Processing {sample}...")
        bam_stats[sample] = collect_bam_stats(bam_file, args.threads)
    
    print("Collecting VCF statistics...")
    for sample, vcf_file in vcf_files.items():
        print(f"  Processing {sample}...")
        vcf_stats[sample] = collect_vcf_stats(vcf_file, args.reference, args.threads)
    
    # Generate HTML report
    print("Generating HTML report...")
    report_file = generate_html_report(bam_stats, vcf_stats, args.output, args.sample_sheet)
    
    print(f"Report generation completed. Output: {report_file}")


if __name__ == "__main__":
    main()