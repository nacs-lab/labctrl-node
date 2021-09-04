# Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>

# This library is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public
# License as published by the Free Software Foundation; either
# version 3.0 of the License, or (at your option) any later version.

# This library is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# Lesser General Public License for more details.

# You should have received a copy of the GNU Lesser General Public
# License along with this library. If not,
# see <http://www.gnu.org/licenses/>.

# This is modified based on
# * eclipse/upm:cmake/modules/FindNode.cmake
# * cmake-js/cmake-js

include(FindPackageHandleStandardArgs)

if(NODE_EXECUTABLE AND NOT EXISTS "${NODE_EXECUTABLE}")
  unset(NODE_EXECUTABLE CACHE)
endif()
if(NOT NODE_EXECUTABLE)
  find_program(NODE_EXECUTABLE NAMES node nodejs
    HINTS $ENV{NODE_DIR}
    PATH_SUFFIXES bin
    DOC "Node.js interpreter")
endif()
if(NODE_EXECUTABLE)
  execute_process(COMMAND "${NODE_EXECUTABLE}" --version
    OUTPUT_VARIABLE _VERSION
    RESULT_VARIABLE _NODE_VERSION_RESULT)
  execute_process(COMMAND "${NODE_EXECUTABLE}" -e "console.log(process.versions.v8)"
    OUTPUT_VARIABLE _V8_VERSION
    RESULT_VARIABLE _V8_RESULT)
  if(NOT _NODE_VERSION_RESULT AND NOT _V8_RESULT)
    string(REPLACE "v" "" NODE_VERSION_STRING "${_VERSION}")
    string(REPLACE "." ";" _VERSION_LIST "${NODE_VERSION_STRING}")
    list(GET _VERSION_LIST 0 NODE_VERSION_MAJOR)
    list(GET _VERSION_LIST 1 NODE_VERSION_MINOR)
    list(GET _VERSION_LIST 2 NODE_VERSION_PATCH)
    set(V8_VERSION_STRING ${_V8_VERSION})
    string(REPLACE "." ";" _V8_VERSION_LIST "${_V8_VERSION}")
    string(REPLACE "." "" V8_DEFINE_STRING "${_V8_VERSION}")
    string(STRIP ${V8_DEFINE_STRING} V8_DEFINE_STRING)
    list(GET _V8_VERSION_LIST 0 V8_VERSION_MAJOR)
    list(GET _V8_VERSION_LIST 1 V8_VERSION_MINOR)
    list(GET _V8_VERSION_LIST 2 V8_VERSION_PATCH)
    # we end up with a nasty newline so strip everything that isn't a number
    string(REGEX MATCH "^[0-9]*" V8_VERSION_PATCH ${V8_VERSION_PATCH})
    string(REGEX REPLACE "\n" "" NODE_VERSION_STRING ${NODE_VERSION_STRING})
    string(REGEX REPLACE "\n" "" V8_VERSION_STRING ${V8_VERSION_STRING})
    message(STATUS "Found v8: version \"${V8_VERSION_STRING}\"")
  endif()
endif()

if(NPM_EXECUTABLE AND NOT EXISTS "${NPM_EXECUTABLE}")
  unset(NPM_EXECUTABLE CACHE)
endif()
if(NOT NPM_EXECUTABLE AND NODE_EXECUTABLE)
  get_filename_component(node_exe_dir "${NODE_EXECUTABLE}" DIRECTORY)
  find_program(NPM_EXECUTABLE NAMES npm
    HINTS $ENV{NODE_DIR}
    PATH_SUFFIXES bin ${node_exe_dir}
    DOC "Node.js package manager")
endif()

find_path(NODE_INCLUDE_DIRS
  NAMES node.h
  PATH_SUFFIXES node nodejs
  PATHS /usr/include /usr/local/include)

function(node_init_target)
  add_custom_command(OUTPUT "${CMAKE_CURRENT_SOURCE_DIR}/package-lock.json"
    WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
    COMMAND "${NPM_EXECUTABLE}" install
    COMMAND touch "${CMAKE_CURRENT_SOURCE_DIR}/package-lock.json"
    DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/package.json")
  add_custom_target(npm-init ALL DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/package-lock.json")
endfunction()

function(node_update_target)
  add_custom_target(npm-update
    WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
    COMMAND "${NPM_EXECUTABLE}" update)
endfunction()

function(node_targets)
  node_init_target()
  node_update_target()
endfunction()

mark_as_advanced(NODE_EXECUTABLE)
find_package_handle_standard_args(Node
  REQUIRED_VARS NODE_EXECUTABLE NPM_EXECUTABLE NODE_INCLUDE_DIRS
  VERSION_VAR NODE_VERSION_STRING)
