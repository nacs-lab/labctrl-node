project(labctrl-node)

## Setup
cmake_minimum_required(VERSION 3.0)
set(CMAKE_MODULE_PATH "${CMAKE_MODULE_PATH}"
  "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

set(SERVER_DIR /srv/labctrl/)

find_package(Node 12.0 REQUIRED)

node_targets()

add_subdirectory(tests)

file(RELATIVE_PATH BIN_DIR_REL "${PROJECT_SOURCE_DIR}" "${PROJECT_BINARY_DIR}")
add_custom_target(deploy
  COMMAND "${PROJECT_SOURCE_DIR}/cmake/deploy_next.sh" "${BIN_DIR_REL}"
  WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
  DEPENDS npm-init)

install(DIRECTORY apis components lib pages server
  DESTINATION "${SERVER_DIR}"
  USE_SOURCE_PERMISSIONS
  PATTERN "*.js")

install(DIRECTORY node_modules public conf "${PROJECT_BINARY_DIR}/exec"
  DESTINATION "${SERVER_DIR}"
  USE_SOURCE_PERMISSIONS)

install(FILES index.js next.config.js
  DESTINATION "${SERVER_DIR}")
