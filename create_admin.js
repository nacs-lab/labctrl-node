#!/usr/bin/env node

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

const prompt = require('prompt');
const path = require('path');

process.env.NODE_ENV = 'production';
process.env.NEXT_DIST_DIR = 'exec';
process.env.NODE_CONFIG_DIR = 'conf';
process.env.LABCTRL_LIB_DIR = path.resolve(__dirname, 'addon');

process.chdir(__dirname);

const account = require('./lib/account');
const User = require('./server/user');

async function create_admin() {
    await User.init();

    prompt.start();

    let result = await new Promise((resolve, reject) => {
        prompt.get([{
            name: 'email',
            required: true,
            conform: function (value) {
                return account.validate_email(value);
            }
        }, {
            name: 'password',
            required: true,
            hidden: true,
            conform: function (value) {
                return account.validate_password(value) === true;
            }
        }, {
            name: 'repeat_password',
            required: true,
            hidden: true,
            conform: function (value) {
                return account.validate_password(value) === true;
            }
        }], function (err, result) {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
    if (result.password != result.repeat_password) {
        console.error("Password mismatch.");
        return;
    }

    if (await User.find_user(result.email)) {
        console.error(`User ${result.email} already exists`);
        return;
    }
    console.log(`Creating admin user ${result.email}`);

    let admin_user = await User.signup(result.email, result.password);
    await admin_user.verify();
    await admin_user.set_admin(true);
    console.log(await User.find_user(result.email));
}

create_admin().catch((err) => {
    console.log(err);
    process.exit(1);
});
