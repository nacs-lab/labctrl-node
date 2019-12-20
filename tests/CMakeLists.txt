#

set(BUILD_DIR "${PROJECT_BINARY_DIR}")
configure_file(conf/test_user.yml.in conf/test_user.yml @ONLY)
configure_file(conf/default.yml.in conf/default.yml @ONLY)

set(CONFIG_DIR "${CMAKE_CURRENT_BINARY_DIR}/conf/")
file(RELATIVE_PATH BIN_DIR_REL "${PROJECT_SOURCE_DIR}" "${PROJECT_BINARY_DIR}")

add_custom_target(test-all
  COMMAND "NODE_CONFIG_DIR=${CONFIG_DIR}"
  "NODE_ENV=development"
  "LABCTRL_LIB_DIR=${PROJECT_BINARY_DIR}/addon"
  "NEXT_DIST_DIR=${BIN_DIR_REL}/dev" "${NODE_EXECUTABLE}" tests/runtests.js
  WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
  DEPENDS npm-init)

add_custom_target(test-server
  COMMAND "NODE_CONFIG_DIR=${CONFIG_DIR}"
  "NODE_ENV=development"
  "LABCTRL_LIB_DIR=${PROJECT_BINARY_DIR}/addon"
  "NEXT_DIST_DIR=${BIN_DIR_REL}/dev" "${NODE_EXECUTABLE}" tests/test_server.js
  WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
  DEPENDS npm-init)

add_custom_target(node-repl
  COMMAND "NODE_CONFIG_DIR=${CONFIG_DIR}"
  "NODE_ENV=development"
  "LABCTRL_LIB_DIR=${PROJECT_BINARY_DIR}/addon"
  "NEXT_DIST_DIR=${BIN_DIR_REL}/dev" "${NODE_EXECUTABLE}" --experimental-repl-await
  WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
  DEPENDS npm-init)
