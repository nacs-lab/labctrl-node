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

try {
    fs.unlinkSync(path.join(config.db.dir, 'user.db'));
}
catch {
}

const User = require('../server/user');

async function create_user() {
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
}

create_user().catch((err) => {
    console.log(err);
    process.exit(1);
});
