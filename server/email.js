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

const config = require('./config');

const nodemailer = require('nodemailer');

async function createTransport() {
    let account;
    if (config.email.test) {
        let test = await nodemailer.createTestAccount();
        account = {
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: test.user, // generated ethereal user
                pass: test.pass // generated ethereal password
            }
        };
    }
    else {
        account = config.email.account;
    }
    return await nodemailer.createTransport(account);
}

class Email {
    constructor() {
        this.init_promise = (async () => {
            this.transport = await createTransport();
        })();
    }
    init() {
        return this.init_promise;
    }
    async send({ to, subject, text, html }) {
        await this.init();
        let info = await this.transport.sendMail({
            from: '"Lab Control" <no-reply@nigrp.org>',
            to, subject, text, html
        });
        if (config.email.test) {
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        return info;
    }
}

module.exports = new Email();
