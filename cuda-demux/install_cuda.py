import os
import platform
import subprocess
import sys

CUDA_DOWNLOAD_URLS = {
    'Windows': 'https://developer.nvidia.com/cuda-downloads',
    'Linux': 'https://developer.nvidia.com/cuda-downloads',
    'Darwin': 'https://developer.nvidia.com/cuda-downloads',
}

def has_nvidia_gpu():
    system = platform.system()
    try:
        if system == 'Linux':
            lspci = subprocess.check_output(['lspci'], encoding='utf-8')
            return 'NVIDIA' in lspci
        elif system == 'Windows':
            output = subprocess.check_output(['wmic', 'path', 'win32_VideoController', 'get', 'name'], encoding='utf-8')
            return 'NVIDIA' in output
        elif system == 'Darwin':
            output = subprocess.check_output(['system_profiler', 'SPDisplaysDataType'], encoding='utf-8')
            return 'NVIDIA' in output
        else:
            print(f"[!] Unsupported OS: {system}")
            return False
    except Exception as e:
        print(f"[!] Error detecting GPU: {e}")
        return False

def prompt_user():
    resp = input("NVIDIA GPU detected. Do you want to install the latest CUDA Toolkit? [y/N]: ").strip().lower()
    return resp == 'y'

def install_cuda(system):
    url = CUDA_DOWNLOAD_URLS.get(system)
    print(f"\nVisit the following page to download the latest CUDA Toolkit for {system}:")
    print(url)
    if system == 'Linux':
        print("\nOn Ubuntu, you can often install via:")
        print("  sudo apt-get update && sudo apt-get install -y nvidia-cuda-toolkit")
    elif system == 'Windows':
        print("\nDownload and run the CUDA installer from the NVIDIA website.")
    elif system == 'Darwin':
        print("\nNote: Native CUDA support on macOS is deprecated and only works with older NVIDIA GPUs and macOS versions.")
    print("\nFollow the instructions on the NVIDIA site for your platform.")

def main():
    system = platform.system()
    print(f"Detected OS: {system}")
    if not has_nvidia_gpu():
        print("No NVIDIA GPU detected. CUDA cannot be installed on this system.")
        sys.exit(1)
    if prompt_user():
        install_cuda(system)
    else:
        print("Installation aborted by user.")

if __name__ == '__main__':
    main()
