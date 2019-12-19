#

set(SRCS
  addon.cpp
  parse.cpp
  )

add_library(labctrl-lib SHARED ${SRCS})
add_dependencies(labctrl-lib npm-init)
set_target_properties(labctrl-lib PROPERTIES PREFIX "" SUFFIX ".node"
  OUTPUT_NAME labctrl
  COMPILE_FLAGS "${DEP_LDFLAGS_OTHER}")
target_link_libraries(labctrl-lib ${DEP_LIBRARIES})
target_include_directories(labctrl-lib PRIVATE ${NODE_INCLUDE_DIRS}
  "${PROJECT_SOURCE_DIR}/node_modules/nan/")
install(TARGETS labctrl-lib
  DESTINATION "${SERVER_DIR}/addon")
