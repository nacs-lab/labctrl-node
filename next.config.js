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

const path = require('path');

const root = path.resolve(__dirname);
const blacklist_prefix = [
    // These module are server only and shouldn't be compiled.
    // They may even contains dynamic loading code and can't be compiled.
    // See `lib/api.js` for the API caller.
    path.join(root, 'server/'),
    path.join(root, 'apis/')
];

module.exports = {
    distDir: (process.env.NEXT_DIST_DIR ? process.env.NEXT_DIST_DIR : '.next'),
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // Note: we provide webpack above so you should not `require` it
        // Perform customizations to webpack config
        // Important: return the modified config

        if (config.externals === undefined)
            config.externals = [];
        if (!Array.isArray(config.externals))
            config.externals = [config.externals];
        // Blacklist modules that we don't want to be packaged
        config.externals.push(function (context, request, callback) {
            if (request[0] == '.') {
                let p = path.join(context, request);
                for (let i in blacklist_prefix) {
                    let prefix = blacklist_prefix[i];
                    if (p.startsWith(prefix)) {
                        // Load the module normally on the server
                        // and load `null` on the client.
                        return callback(null, isServer ? p : "null");
                    }
                }
            }
            return callback();
        });
        return config
    },
};
