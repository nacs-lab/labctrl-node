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

function absolute_url(req, url) {
    let host;
    if (req.app.get('trust proxy'))
        host = req.get('X-Forwarded-Host');
    if (!host)
        host = req.get('Host');
    if (!host)
        host = req.hostname;
    let baseurl = req.protocol + '://' + host;
    if (url && url[0] == '/')
        return baseurl + url;
    return baseurl + '/' + url;
}

module.exports.absolute_url = absolute_url;
