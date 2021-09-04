cmake_minimum_required(VERSION 3.0)

set(MAJOR_VERSION 1)
set(MINOR_VERSION 0)
set(PATCH_VERSION 0)

project(labctrl-node VERSION "${MAJOR_VERSION}.${MINOR_VERSION}.${PATCH_VERSION}")

## Setup
set(CMAKE_MODULE_PATH "${CMAKE_MODULE_PATH}"
  "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

include(GNUInstallDirs)

set(SERVER_DIR /srv/labctrl/)
set(SYSTEMD_SERVICE_DIR "${CMAKE_INSTALL_LIBDIR}/systemd/system"
  CACHE PATH "Systemd service file install dir")
set(SYSTEMD_SYSUSERS_DIR "${CMAKE_INSTALL_LIBDIR}/sysusers.d"
  CACHE PATH "Systemd sysusers file install dir")
set(SYSTEMD_TMPFILES_DIR "${CMAKE_INSTALL_LIBDIR}/tmpfiles.d"
  CACHE PATH "Systemd tmpfiles file install dir")

find_package(Node 14.0 REQUIRED)

find_package(PkgConfig REQUIRED)
set(DEP_PKGS nacs-utils>=11.0 nacs-seq libzmq>=4.0)
pkg_check_modules(DEP REQUIRED ${DEP_PKGS})

add_definitions(-Wall -Wextra -g -pthread -fvisibility=hidden
  -Wno-psabi -Wno-unknown-warning-option -Wno-cast-function-type
  -fno-math-errno -Wconversion -Wno-sign-conversion ${DEP_CFLAGS})
include_directories(${DEP_INCLUDE_DIRS} ${NODE_INCLUDE_DIRS})

set(LINKER_FLAGS "-Wl,--as-needed -Wl,--gc-sections")
set(LINKER_FLAGS "${LINKER_FLAGS} -pthread -fno-math-errno -Wl,-Bsymbolic")

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -std=gnu11")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=gnu++17")
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${LINKER_FLAGS}")
set(CMAKE_STATIC_LINKER_FLAGS "${CMAKE_STATIC_LINKER_FLAGS} ${LINKER_FLAGS}")
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${LINKER_FLAGS}")
set(CMAKE_MODULE_LINKER_FLAGS "${CMAKE_MODULE_LINKER_FLAGS} ${LINKER_FLAGS}")

node_targets()

add_custom_target(compile-all ALL)

add_subdirectory(addon)
add_subdirectory(tests)
add_subdirectory(data)

file(RELATIVE_PATH BIN_DIR_REL "${PROJECT_SOURCE_DIR}" "${PROJECT_BINARY_DIR}")
set(DEPLOY_BUILD_DIR "${PROJECT_BINARY_DIR}/deploy")
configure_file(cmake/production.yml.in deploy/conf/production.yml @ONLY)
add_custom_target(deploy
  COMMAND "NODE_CONFIG_DIR=${DEPLOY_BUILD_DIR}/conf"
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

install(PROGRAMS create_admin.js
  DESTINATION "${SERVER_DIR}" RENAME create_admin)


if(EXISTS "${CMAKE_ROOT}/Modules/CPack.cmake")
  include(InstallRequiredSystemLibraries)

  get_filename_component(SERVER_DIR_FULL "${SERVER_DIR}"
    ABSOLUTE BASE_DIR "${CMAKE_INSTALL_PREFIX}")
  configure_file(deb/conffiles.in conffiles @ONLY)

  set(CPACK_SET_DESTDIR "on")
  set(CPACK_PACKAGING_INSTALL_PREFIX "/tmp")
  set(CPACK_GENERATOR "DEB")

  set(CPACK_PACKAGE_NAME "${CMAKE_PROJECT_NAME}" CACHE STRING "DEB package name")
  set(CPACK_PACKAGE_DESCRIPTION "NaCs Lab Control Web Frontend")
  set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Web frontend for lab control")
  set(CPACK_PACKAGE_VENDOR "Harvard")
  set(CPACK_PACKAGE_CONTACT "Yichao Yu")
  if("${CPACK_DEBIAN_PACKAGE_RELEASE}" STREQUAL "")
    set(DEB_SUFFIX "")
  else()
    set(DEB_SUFFIX "-${CPACK_DEBIAN_PACKAGE_RELEASE}")
  endif()
  string(TOLOWER "${CMAKE_SYSTEM_PROCESSOR}" system_processor)
  if("${system_processor}" STREQUAL "x86_64" OR
      "${system_processor}" STREQUAL "x86-64" OR
      "${system_processor}" STREQUAL "amd64")
    set(CPACK_DEBIAN_PACKAGE_ARCHITECTURE "amd64")
  elseif("${system_processor}" STREQUAL "x86" OR
      "${system_processor}" STREQUAL "i386" OR
      "${system_processor}" STREQUAL "i486" OR
      "${system_processor}" STREQUAL "i586" OR
      "${system_processor}" STREQUAL "i686")
    set(CPACK_DEBIAN_PACKAGE_ARCHITECTURE "i386")
  elseif("${system_processor}" STREQUAL "arm" OR
      "${system_processor}" STREQUAL "armv7l" OR
      "${system_processor}" STREQUAL "armhf")
    set(CPACK_DEBIAN_PACKAGE_ARCHITECTURE "armhf")
  elseif("${system_processor}" STREQUAL "aarch64" OR
      "${system_processor}" STREQUAL "arm64")
    set(CPACK_DEBIAN_PACKAGE_ARCHITECTURE "arm64")
  else()
    message(WARNING "Unrecognized architecture ${system_processor}")
    set(CPACK_DEBIAN_PACKAGE_ARCHITECTURE "${system_processor}")
  endif()
  set(CPACK_PACKAGE_FILE_NAME
    "${CPACK_PACKAGE_NAME}_${MAJOR_VERSION}.${MINOR_VERSION}.${PATCH_VERSION}${DEB_SUFFIX}_${CPACK_DEBIAN_PACKAGE_ARCHITECTURE}")

  set(CPACK_DEBIAN_PACKAGE_DEPENDS "libstdc++6 (>= 4.2.1), libnacs (>= 11.0), libzmq5 (>= 4.0), nodejs (>=14.0)")
  set(CPACK_DEBIAN_PACKAGE_CONTROL_EXTRA ${CMAKE_BINARY_DIR}/conffiles)

  set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")
  set(CPACK_DEBIAN_PACKAGE_SECTION "")

  set(CPACK_COMPONENTS_ALL Libraries ApplicationData)
  include(CPack)
endif()
