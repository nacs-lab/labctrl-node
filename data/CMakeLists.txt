#

configure_file(labctrl-node.service.in labctrl-node.service @ONLY)
configure_file(labctrl-node.sysusers.in labctrl-node.sysusers @ONLY)

install(FILES "${CMAKE_CURRENT_BINARY_DIR}/labctrl-node.service"
  DESTINATION "${SYSTEMD_SERVICE_DIR}")
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/labctrl-node.sysusers"
  DESTINATION "${SYSTEMD_SYSUSERS_DIR}")
