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

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Do not use this script to create the production database.
assert(process.env.NODE_ENV == 'development');

const config = require('../server/config');

function unlink(path) {
    return new Promise((resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err)
                return reject(err);
            resolve();
        });
    });
}

async function create_user() {
    await unlink(path.join(config.db.dir, 'user.db'));

    // Import after the DB file has been deleted.
    const User = require('../server/user');
    await User.init();
    assert(await User.count() == 0);

    console.log("Creating admin user: admin@nigrp.org");
    assert(!(await User.find_user('admin@nigrp.org')));
    let admin_user = await User.signup('admin@nigrp.org', 'abcdef123456');
    assert(admin_user.email == 'admin@nigrp.org');
    assert(admin_user.verified === false);
    assert(admin_user.approved === false);
    assert(admin_user.admin === false);
    assert(admin_user.requested === false);
    assert(admin_user.password_hash);
    assert(!admin_user.last_failed);
    await admin_user.verify();
    await admin_user.set_admin(true);
    console.log(await User.find_user('admin@nigrp.org'));

    console.log("Creating normal user: user1@nigrp.org");
    assert(!(await User.find_user('user1@nigrp.org')));
    let normal_user = await User.signup('user1@nigrp.org', 'abcdef123456');
    assert(normal_user.email == 'user1@nigrp.org');
    assert(normal_user.verified === false);
    assert(normal_user.approved === false);
    assert(normal_user.admin === false);
    assert(normal_user.requested === false);
    assert(normal_user.password_hash);
    assert(!normal_user.last_failed);
    await normal_user.verify();
    await normal_user.set_approved(true);
    console.log(await User.find_user('user1@nigrp.org'));
}

async function create_source() {
    await unlink(path.join(config.db.dir, 'sources.db'));

    // Import after the DB file has been deleted.
    const SourceDB = require('../server/source_db');
    await SourceDB.init();
    assert(await SourceDB.count() == 0);

    console.log("Creating dummy Zynq source");
    let src = await SourceDB.add_source('zynq', 'Dummy Zynq 1',
                                        { addr: 'tcp://127.0.0.1:6666' });
    console.log(src);
}

create_user().catch((err) => {
    console.log(err);
    process.exit(1);
});

create_source().catch((err) => {
    console.log(err);
    process.exit(1);
});
