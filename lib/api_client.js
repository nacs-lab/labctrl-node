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

// Client version: send a JSON POST request to the server.
// The `req` (second) argument will be `undefined` for client.
// The server will recieve the request with the correct credential
// and pass that to the server version.
module.exports = async (specs) => {
    const response = await fetch("/api", {
        method: "POST",
        headers: {
            "Content-type": "application/json",
            "Accept": "application/json",
            "Accept-Charset": "utf-8"
        },
        body: JSON.stringify(specs)
    });
    return await response.json();
};
