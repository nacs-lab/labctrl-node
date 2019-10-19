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

const compression = require('compression');
const express = require('express');
const http = require('http');
const path = require('path');

const data_dir = path.join(__dirname, '../public/');

class Server {
    constructor() {
        this.express = express();
        this.http = http.createServer(this.express);
        this.express.use(compression());
        this.express.use('/favicon.ico',
                         express.static(path.join(data_dir, 'img/favicon.ico')));
        this.express.get('/', function (req, res) {
            res.sendFile('/html/index.html', {root: data_dir});
        });
    }
    listen() {
        this.http.listen.apply(this.http, arguments);
    }
};

module.exports = Server;
