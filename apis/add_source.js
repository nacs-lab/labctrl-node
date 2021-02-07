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

const SourceDB = require('../server/source_db');
const Server = require('../server/server');

module.exports = async ({ req }, params) => {
    if (!req.nacs_user || !req.nacs_user.approved)
        return { error: "Not logged in or not approved." };

    let { type, name, src_params } = params;
    if (!type || !name || src_params === undefined)
        return { error: "Missing required source parameter." };
    if (!SourceDB.check_type(type))
        return { error: `Unknown source type: ${type}` };
    if (await SourceDB.findOne({ where: { name }}))
        return { error: `Source name ${name} already exist.` };

    let server = Server.current();
    if (!server)
        return { error: "Cannot find server." };
    let src = await SourceDB.add_source(type, name, src_params, server.sock_mgr);
    if (!src)
        return { error: "Unknown error." };
    return true;
};
