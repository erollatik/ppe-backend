# CMAKE generated file: DO NOT EDIT!
# Generated by "Unix Makefiles" Generator, CMake Version 4.0

# Delete rule output on recipe failure.
.DELETE_ON_ERROR:

#=============================================================================
# Special targets provided by cmake.

# Disable implicit rules so canonical targets will work.
.SUFFIXES:

# Disable VCS-based implicit rules.
% : %,v

# Disable VCS-based implicit rules.
% : RCS/%

# Disable VCS-based implicit rules.
% : RCS/%,v

# Disable VCS-based implicit rules.
% : SCCS/s.%

# Disable VCS-based implicit rules.
% : s.%

.SUFFIXES: .hpux_make_needs_suffix_list

# Command-line flag to silence nested $(MAKE).
$(VERBOSE)MAKESILENT = -s

#Suppress display of executed commands.
$(VERBOSE).SILENT:

# A target that is always out of date.
cmake_force:
.PHONY : cmake_force

#=============================================================================
# Set environment variables for the build.

# The shell in which to execute make rules.
SHELL = /bin/sh

# The CMake executable.
CMAKE_COMMAND = /opt/homebrew/bin/cmake

# The command to remove a file.
RM = /opt/homebrew/bin/cmake -E rm -f

# Escaping for special characters.
EQUALS = =

# The top-level source directory on which CMake was run.
CMAKE_SOURCE_DIR = /Users/erolatik/tez/backend

# The top-level build directory on which CMake was run.
CMAKE_BINARY_DIR = /Users/erolatik/tez/backend/build

# Include any dependencies generated for this target.
include CMakeFiles/ppe_bridge.dir/depend.make
# Include any dependencies generated by the compiler for this target.
include CMakeFiles/ppe_bridge.dir/compiler_depend.make

# Include the progress variables for this target.
include CMakeFiles/ppe_bridge.dir/progress.make

# Include the compile flags for this target's objects.
include CMakeFiles/ppe_bridge.dir/flags.make

CMakeFiles/ppe_bridge.dir/codegen:
.PHONY : CMakeFiles/ppe_bridge.dir/codegen

CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o: CMakeFiles/ppe_bridge.dir/flags.make
CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o: /Users/erolatik/tez/backend/src/cpp-bridge/ppe_bridge.cpp
CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o: CMakeFiles/ppe_bridge.dir/compiler_depend.ts
	@$(CMAKE_COMMAND) -E cmake_echo_color "--switch=$(COLOR)" --green --progress-dir=/Users/erolatik/tez/backend/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building CXX object CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -MD -MT CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o -MF CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o.d -o CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o -c /Users/erolatik/tez/backend/src/cpp-bridge/ppe_bridge.cpp

CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color "--switch=$(COLOR)" --green "Preprocessing CXX source to CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.i"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /Users/erolatik/tez/backend/src/cpp-bridge/ppe_bridge.cpp > CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.i

CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color "--switch=$(COLOR)" --green "Compiling CXX source to assembly CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.s"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /Users/erolatik/tez/backend/src/cpp-bridge/ppe_bridge.cpp -o CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.s

# Object files for target ppe_bridge
ppe_bridge_OBJECTS = \
"CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o"

# External object files for target ppe_bridge
ppe_bridge_EXTERNAL_OBJECTS =

ppe_bridge: CMakeFiles/ppe_bridge.dir/src/cpp-bridge/ppe_bridge.cpp.o
ppe_bridge: CMakeFiles/ppe_bridge.dir/build.make
ppe_bridge: /opt/homebrew/lib/libopencv_gapi.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_stitching.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_alphamat.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_aruco.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_bgsegm.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_bioinspired.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_ccalib.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_dnn_objdetect.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_dnn_superres.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_dpm.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_face.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_freetype.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_fuzzy.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_hfs.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_img_hash.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_intensity_transform.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_line_descriptor.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_mcc.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_quality.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_rapid.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_reg.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_rgbd.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_saliency.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_sfm.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_signal.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_stereo.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_structured_light.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_superres.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_surface_matching.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_tracking.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_videostab.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_viz.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_wechat_qrcode.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_xfeatures2d.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_xobjdetect.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_xphoto.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libjsoncpp.26.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_shape.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_highgui.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_datasets.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_plot.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_text.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_ml.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_phase_unwrapping.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_optflow.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_ximgproc.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_video.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_videoio.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_imgcodecs.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_objdetect.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_calib3d.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_dnn.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_features2d.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_flann.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_photo.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_imgproc.4.11.0.dylib
ppe_bridge: /opt/homebrew/lib/libopencv_core.4.11.0.dylib
ppe_bridge: /opt/homebrew/Cellar/brotli/1.1.0/lib/libbrotlicommon.dylib
ppe_bridge: /opt/homebrew/Cellar/brotli/1.1.0/lib/libbrotlienc.dylib
ppe_bridge: /opt/homebrew/Cellar/brotli/1.1.0/lib/libbrotlidec.dylib
ppe_bridge: /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib/libz.tbd
ppe_bridge: /opt/homebrew/Cellar/openssl@3/3.5.0/lib/libssl.dylib
ppe_bridge: /opt/homebrew/Cellar/openssl@3/3.5.0/lib/libcrypto.dylib
ppe_bridge: CMakeFiles/ppe_bridge.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color "--switch=$(COLOR)" --green --bold --progress-dir=/Users/erolatik/tez/backend/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking CXX executable ppe_bridge"
	$(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/ppe_bridge.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
CMakeFiles/ppe_bridge.dir/build: ppe_bridge
.PHONY : CMakeFiles/ppe_bridge.dir/build

CMakeFiles/ppe_bridge.dir/clean:
	$(CMAKE_COMMAND) -P CMakeFiles/ppe_bridge.dir/cmake_clean.cmake
.PHONY : CMakeFiles/ppe_bridge.dir/clean

CMakeFiles/ppe_bridge.dir/depend:
	cd /Users/erolatik/tez/backend/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /Users/erolatik/tez/backend /Users/erolatik/tez/backend /Users/erolatik/tez/backend/build /Users/erolatik/tez/backend/build /Users/erolatik/tez/backend/build/CMakeFiles/ppe_bridge.dir/DependInfo.cmake "--color=$(COLOR)"
.PHONY : CMakeFiles/ppe_bridge.dir/depend

