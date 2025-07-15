cmake_minimum_required(VERSION 3.16)
project(cuda-demux LANGUAGES CXX CUDA)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CUDA_STANDARD 17)

find_package(CUDA)
if(NOT CUDA_FOUND)
    message(FATAL_ERROR "CUDA not found!\nPlease ensure you have an NVIDIA GPU and the CUDA Toolkit installed.\nRun 'python3 install_cuda.py' for guidance.")
endif()

# Add the source files
add_executable(cuda-demux
    src/main.cpp
    src/demux.cu
)

target_include_directories(cuda-demux PRIVATE ${CMAKE_SOURCE_DIR}/include)

target_compile_options(cuda-demux PRIVATE
    $<$<COMPILE_LANGUAGE:CXX>:-Wall -Wextra -Wpedantic>
    $<$<COMPILE_LANGUAGE:CUDA>:-Xcompiler=-Wall,-Wextra,-Wpedantic>
)

# Set CUDA properties
set_target_properties(cuda-demux PROPERTIES
    CUDA_SEPARABLE_COMPILATION ON
    CUDA_ARCHITECTURES "52;60;61;70;75;80"
)

option(BUILD_TESTS "Build tests" ON)
if(BUILD_TESTS)
    add_executable(test_demux tests/test_demux.cpp)
    target_include_directories(test_demux PRIVATE ${CMAKE_SOURCE_DIR}/include)
    target_link_libraries(test_demux PRIVATE cuda-demux)
endif()
