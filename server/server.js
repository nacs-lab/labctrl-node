/*************************************************************************
 *   Copyright (c) 2019 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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

const api = require('./api');
const config = require('./config');
const SocketManager = require('./socket_manager');
const SourceDB = require('./source_db');
const DemoSource = require('./demo_source');
const MetaSource = require('./meta_source');
const User = require('./user');
const user_session = require('./user_session');

const body_parser = require('body-parser');
const cls = require('cls-hooked');
const compression = require('compression');
const cookie_parser = require('cookie-parser');
const express = require('express');
const http = require('http');
const next = require('next');
const path = require('path');
const socketio = require('socket.io');
const ip_filter = require("ip-filter");

const data_dir = path.join(__dirname, '../public/');

function trusted_ip(ip) {
    if (!ip)
        return false;
    if (ip_filter(ip, config.untrust_ips))
        return false;
    return !!ip_filter(ip, config.trust_ips);
}

function check_ip(req, res, next) {
    req.nacs_trusted = trusted_ip(req.ip);
    next();
}

function check_ip_socket(socket, next) {
    let ip = socket.request.connection.remoteAddress;
    if (config.trust_proxy) {
        let proxy = socket.handshake.headers['x-forwarded-for'];
        if (proxy)
            proxy = proxy.trim().split(' ')[0]
        ip = proxy ? proxy : ip;
    }
    socket.request.nacs_trusted = trusted_ip(ip);
    next();
}

function midware_express2io(mw) {
    return function (socket, next) {
        mw(socket.request, {}, next);
    };
}

class Server {
    static namespace = cls.createNamespace('labctrl-server-ns');
    static current() {
        return this.namespace.get('server');
    }
    constructor() {
        this.next = next({ dev: process.env.NODE_ENV == 'development' });
        this.handle = this.next.getRequestHandler();
        this.sock_mgr = new SocketManager();
        this.sock_mgr.set_auth_handler((sock) => this.request_approved(sock.request));
        this.sock_mgr.add_source(new DemoSource('demo0'));
        this.sock_mgr.add_source(new MetaSource('meta'));
        this.prepare = Promise.all([this.next.prepare(),
                                    SourceDB.register_all(this.sock_mgr),
                                    User.init()]).then(() => {
                                        this.init();
                                    });
    }
    async request_approved(req) {
        if (!req)
            return false;
        if (req.nacs_trusted)
            return true;
        return (req.nacs_user && await req.nacs_user.isapproved() &&
                req.nacs_user_token && await req.nacs_user_token.isvalid());
    }
    init() {
        this.express = express();
        if (config.trust_proxy)
            this.express.set('trust proxy', true);
        this.http = http.createServer(this.express);
        let setup_ns = (req, res, next) => {
            return Server.namespace.runAndReturn(() => {
                Server.namespace.set('server', this);
                return next();
            });
        };
        let cp = cookie_parser();

        this.io = socketio(this.http);
        this.io.use(midware_express2io(cp));
        this.io.use(check_ip_socket);
        this.io.use(midware_express2io(user_session));
        this.io.use(midware_express2io(setup_ns));
        this.io.use(function (socket, next) {
            let req = socket.request;
            if (!req.nacs_trusted && (!req.nacs_user || !req.nacs_user.approved))
                return next(new Error('Not authorized.'));
            next();
        });
        this.io.on('connection', (sock) => {
            this.sock_mgr.add_socket(sock);
        });

        this.express.use(compression());
        this.express.use('/favicon.ico',
                         express.static(path.join(data_dir, 'img/favicon.ico')));
        this.express.use(body_parser.json());
        this.express.use(cp);
        this.express.use(check_ip);
        this.express.use(user_session);
        this.express.use(setup_ns);
        this.express.post('/api', async (req, res, next) => {
            // This handles the client version of the API.

            // Handle exception as per:
            // http://www.acuriousanimal.com/2018/02/15/express-async-middleware.html
            try {
                // Relies on the body parser above to parse the request data.
                res.type("json").send(JSON.stringify(await api(req.body, { req, res })));
            }
            catch (err) {
                next(err);
            }
        });
        this.express.use('/verify', (req, res, next) => {
            return this.next.render(req, res, '/verify', { token: req.path });
        });
        this.express.all('*', (req, res) => {
            return this.handle(req, res);
        });
    }
    listen(...args) {
        this.prepare = this.prepare.then(() => {
            this.http.listen.apply(this.http, args);
        });
    }
};

module.exports = Server;
