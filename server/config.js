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

const dev = process.env.NODE_ENV == 'development';
exports.dev = dev;

const config = require('config');
const fs = require('fs');

const db = {
    dir: config.get('db.dir')
};
fs.mkdirSync(db.dir, {recursive: true, mode: 0o755});
exports.db = db;

const data = {
    dir: config.get('data.dir')
};
fs.mkdirSync(data.dir, {recursive: true, mode: 0o755});
exports.data = data;

if (dev && !config.has('email.account')) {
    exports.email = { test: true };
}
else {
    exports.email = {
        test: false,
        account: config.get('email.account')
    };
}
