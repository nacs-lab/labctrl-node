#

configure_file(labctrl-node.service.in labctrl-node.service @ONLY)
configure_file(labctrl-node.sysusers.in labctrl-node.sysusers @ONLY)
configure_file(labctrl-node.tmpfiles.in labctrl-node.tmpfiles @ONLY)

install(FILES "${CMAKE_CURRENT_BINARY_DIR}/labctrl-node.service"
  DESTINATION "${SYSTEMD_SERVICE_DIR}")
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/labctrl-node.sysusers"
  DESTINATION "${SYSTEMD_SYSUSERS_DIR}" RENAME labctrl-node.conf)
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/labctrl-node.tmpfiles"
  DESTINATION "${SYSTEMD_TMPFILES_DIR}" RENAME labctrl-node.conf)
