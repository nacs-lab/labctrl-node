project(labctrl-node)

## Setup
cmake_minimum_required(VERSION 3.0)
set(CMAKE_MODULE_PATH "${CMAKE_MODULE_PATH}"
  "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

set(MAJOR_VERSION 1)
set(MINOR_VERSION 0)
set(PATCH_VERSION 0)

set(SERVER_DIR /srv/labctrl/)

find_package(Node 12.0 REQUIRED)

find_package(PkgConfig REQUIRED)
set(DEP_PKGS nacs-utils>=10.0 nacs-seq libzmq>=4.0)
pkg_check_modules(DEP REQUIRED ${DEP_PKGS})

add_definitions(-Wall -Wextra -g -pthread -fvisibility=hidden
  -Wno-psabi -Wno-unknown-warning-option -Wno-cast-function-type
  -fno-math-errno -Wconversion -Wno-sign-conversion ${DEP_CFLAGS})
include_directories(${DEP_INCLUDE_DIRS} ${NODE_INCLUDE_DIRS})

set(LINKER_FLAGS "-Wl,--as-needed -Wl,--gc-sections")
set(LINKER_FLAGS "${LINKER_FLAGS} -pthread -fno-math-errno -Wl,-Bsymbolic")

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -std=gnu11")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=gnu++14")
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${LINKER_FLAGS}")
set(CMAKE_STATIC_LINKER_FLAGS "${CMAKE_STATIC_LINKER_FLAGS} ${LINKER_FLAGS}")
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${LINKER_FLAGS}")
set(CMAKE_MODULE_LINKER_FLAGS "${CMAKE_MODULE_LINKER_FLAGS} ${LINKER_FLAGS}")

node_targets()

add_custom_target(compile-all ALL)

add_subdirectory(addon)
add_subdirectory(tests)

file(RELATIVE_PATH BIN_DIR_REL "${PROJECT_SOURCE_DIR}" "${PROJECT_BINARY_DIR}")
add_custom_target(deploy
  COMMAND "NODE_CONFIG_DIR=${PROJECT_SOURCE_DIR}/conf"
  "NODE_COMPILING=1"
  "LABCTRL_LIB_DIR=${PROJECT_BINARY_DIR}/addon"
  "${PROJECT_SOURCE_DIR}/cmake/deploy_next.sh" "${BIN_DIR_REL}"
  WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
  DEPENDS compile-all)

install(DIRECTORY apis components lib pages server
  DESTINATION "${SERVER_DIR}"
  USE_SOURCE_PERMISSIONS
  PATTERN "*.js")

install(DIRECTORY node_modules public conf "${PROJECT_BINARY_DIR}/exec"
  DESTINATION "${SERVER_DIR}"
  USE_SOURCE_PERMISSIONS)

install(FILES index.js next.config.js
  DESTINATION "${SERVER_DIR}")

if(EXISTS "${CMAKE_ROOT}/Modules/CPack.cmake")
  include(InstallRequiredSystemLibraries)

  set(CPACK_SET_DESTDIR "on")
  set(CPACK_PACKAGING_INSTALL_PREFIX "/tmp")
  set(CPACK_GENERATOR "DEB")

  set(CPACK_PACKAGE_DESCRIPTION "NaCs Lab Control Web Frontend")
  set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Web frontend for lab control")
  set(CPACK_PACKAGE_VENDOR "Harvard")
  set(CPACK_PACKAGE_CONTACT "Yichao Yu")
  set(CPACK_PACKAGE_VERSION_MAJOR "${MAJOR_VERSION}")
  set(CPACK_PACKAGE_VERSION_MINOR "${MINOR_VERSION}")
  set(CPACK_PACKAGE_VERSION_PATCH "${PATCH_VERSION}")
  set(CPACK_PACKAGE_FILE_NAME
    "${CMAKE_PROJECT_NAME}_${MAJOR_VERSION}.${MINOR_VERSION}.${CPACK_PACKAGE_VERSION_PATCH}")
  set(CPACK_SOURCE_PACKAGE_FILE_NAME
    "${CMAKE_PROJECT_NAME}_${MAJOR_VERSION}.${MINOR_VERSION}.${CPACK_PACKAGE_VERSION_PATCH}")

  set(CPACK_DEBIAN_PACKAGE_DEPENDS "libstdc++6 (>= 4.2.1), libnacs (>= 10.0), libzmq5 (>= 4.0), nodejs (>=12.0)")

  set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")
  set(CPACK_DEBIAN_PACKAGE_SECTION "")
  set(CPACK_DEBIAN_ARCHITECTURE ${CMAKE_SYSTEM_PROCESSOR})
  include(CPack)
endif()
