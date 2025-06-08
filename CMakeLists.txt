cmake_minimum_required(VERSION 3.10)
project(PPEBridge)

set(CMAKE_CXX_STANDARD 17)

# Find packages
find_package(PkgConfig REQUIRED)
find_package(OpenCV REQUIRED)

# Include directories
include_directories(${OpenCV_INCLUDE_DIRS})

# Source dosyasının doğru yolu
add_executable(ppe_bridge src/cpp-bridge/ppe_bridge.cpp)

# Link libraries
target_link_libraries(ppe_bridge ${OpenCV_LIBS})

# jsoncpp için
find_package(jsoncpp REQUIRED)
target_link_libraries(ppe_bridge jsoncpp_lib)

# Download httplib if not found
include(FetchContent)
FetchContent_Declare(
    httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.14.1
)
FetchContent_MakeAvailable(httplib)
target_link_libraries(ppe_bridge httplib::httplib)
