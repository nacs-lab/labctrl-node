/*************************************************************************
 *   Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>             *
 *                                                                       *
 *   This library is free software; you can redistribute it and/or       *
 *   modify it under the terms of the GNU Lesser General Public          *
 *   License as published by the Free Software Foundation; either        *
 *   version 3.0 of the License, or (at your option) any later version.  *
 *                                                                       *
 *   This library is distributed in the hope that it will be useful,     *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of      *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU    *
 *   Lesser General Public License for more details.                     *
 *                                                                       *
 *   You should have received a copy of the GNU Lesser General Public    *
 *   License along with this library. If not,                            *
 *   see <http://www.gnu.org/licenses/>.                                 *
 *************************************************************************/

"use strict";

const path = require("path");

const prefix = "../apis/";

// Server version:
// The `ctx` argument is always with at least `req` and `res` as field valid
// and can be used to verify and update the credential of the user.
module.exports = async (specs, ctx) => {
    let res = {};
    for (let key in specs) {
        let spec = specs[key];
        let spath;
        let params = undefined;
        if (typeof spec === 'string') {
            spath = spec;
        }
        else {
            spath = spec.path;
            params = spec.params;
        }
        if (!spath)
            spath = key;
        spath = path.posix.normalize(path.join(prefix, spath));
        // Ignore illegal paths.
        if (!spath.startsWith(prefix)) {
            console.log(`Page data: requested path: ${spath} outside ../apis`);
            continue;
        }
        try {
            res[key] = await require(spath)(ctx, params);
        }
        catch (e) {
            console.log("Error during API call: ", e);
        }
    }
    return res;
};
