#!/bin/bash

BIN_DIR_REL="$1"
export NEXT_DIST_DIR="${BIN_DIR_REL}/exec"

git_is_dirty() {
    # Based on https://stackoverflow.com/questions/2657935/checking-for-a-dirty-index-or-untracked-files-with-git
    if u="$(git diff-index HEAD --)" && [ -n "$u" ]; then
        # Changed files
        return 0
    elif u="$(git ls-files --others --exclude-standard)" && [ -n "$u" ]; then
        # New files
        return 0
    else
        return 1
    fi
}

if git_is_dirty &> /dev/null; then
    is_dirty=1
else
    is_dirty=0
fi
generate_build_id() {
    if [[ -f VERSION ]]; then
        cat VERSION
    else
        hash=$(git rev-parse HEAD)
        if ((is_dirty)); then
            echo "${hash}-dirty"
        else
            echo "${hash}"
        fi
    fi
}

build_id=$(generate_build_id)
export NEXT_BUILD_ID="${build_id}"
if [ -f "${NEXT_DIST_DIR}/BUILD_ID" ] && ((!is_dirty)) &&
       [ "$(cat "${NEXT_DIST_DIR}/BUILD_ID")" = "${build_id}" ]; then
    exit 0
fi

echo "Build ID: ${NEXT_BUILD_ID}"
rm -rf "${NEXT_DIST_DIR}"
if ! node_modules/next/dist/bin/next build; then
    rm -rf "${NEXT_DIST_DIR}"
fi
