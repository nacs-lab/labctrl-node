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

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Override the environment variable
// since other packages might get the debugging state from this.
process.env.NODE_ENV = 'development';
process.env.NODE_CONFIG_ENV = 'test_user';
process.env.NODE_CONFIG_DIR = path.resolve(__dirname, 'conf');

const config = require('../server/config');

try {
    fs.unlinkSync(path.join(config.db.dir, 'user.db'));
}
catch {
}

const sleep = require('../lib/sleep');
const User = require('../server/user');

async function test() {
    await User.init();
    assert(await User.count() == 0);

    console.log("user 1: a@b.c");
    assert(!(await User.find_user('a@b.c')));
    let user1 = await User.signup('a@b.c', '1234');
    assert(user1.email == 'a@b.c');
    assert(user1.verified === false);
    assert(user1.approved === false);
    assert(user1.admin === false);
    assert(user1.requested === false);
    assert(user1.password_hash);
    assert(!user1.last_failed);
    assert(await User.find_user('a@b.c'));
    let u = await User.login('a@b.c', '1234');
    assert(u === false); // not verified
    u = await User.login('a@b.c', '1238');
    assert(u === null);
    // Too fast retry.
    u = await User.login('a@b.c', '1234');
    assert(u === null);
    assert((await User.find_user('a@b.c')).last_failed);
    let infos = await User.all_infos();
    assert(JSON.stringify(infos) == '[{"email":"a@b.c","verified":false,"approved":false,"admin":false,"requested":false}]');

    let retry_login = (async () => {
        console.log("Sleeping for 6.5 seconds.");
        await sleep(6500);
        let u = await User.login('a@b.c', '1234');
        assert(u === false);

        await user1.reload();
        assert(!user1.last_failed);
        assert(await user1.verify());
        assert(user1.verified === true);
        assert(user1.approved === false);
        assert(user1.admin === false);
        assert(user1.requested === true);
        u = await User.login('a@b.c', '1234');
        assert(u);
    })();

    assert(await User.invite('a@b.c') === null);

    console.log("user 2: c@d.e");
    let user2 = await User.invite('c@d.e');
    assert(user2);
    assert(user2.email == 'c@d.e');
    assert(user2.verified === false);
    assert(user2.approved === true);
    assert(user2.admin === false);
    assert(user2.requested === false);
    assert(!user2.password_hash);
    assert(!user2.last_failed);
    assert(await user2.verify());
    assert(await user2.update_password('abcdefg'));

    assert(user2.verified === true);
    assert(user2.approved === true);
    assert(user2.admin === false);
    assert(user2.requested === false);
    assert(user2.password_hash);
    assert(await User.login('c@d.e', 'abcdefg'));

    assert(await user2.set_admin(true));
    assert(user2.verified === true);
    assert(user2.approved === true);
    assert(user2.admin === true);
    assert(user2.requested === false);

    assert(await user2.set_approved(false));
    assert(user2.verified === true);
    assert(user2.approved === false);
    assert(user2.admin === false);
    assert(user2.requested === false);

    assert(await user2.request());
    assert(user2.verified === true);
    assert(user2.approved === false);
    assert(user2.admin === false);
    assert(user2.requested === true);

    assert(await user2.set_admin(true));
    assert(user2.verified === true);
    assert(user2.approved === true);
    assert(user2.admin === true);
    assert(user2.requested === false);

    console.log("Token");
    let token_str = await user2.new_token(User.Token.LoginSession, new Date(Date.now() + 500));
    assert(token_str);
    let token = await User.find_token(token_str);
    assert(token);
    assert((await token.getUser()).email == user2.email);
    let retry_token = (async (token, token_str) => {
        token.update_expire(new Date(Date.now() + 1100));
        console.log("Sleeping for 0.7 seconds.");
        await sleep(700);
        assert(await User.find_token(token_str));
        console.log("Sleeping for 0.6 seconds.");
        await sleep(600);
        assert(!(await User.find_token(token_str)));
    })(token, token_str);
    token_str = await user1.new_token(User.Token.LoginSession, new Date(Date.now() + 1000));
    assert(token_str);
    token = await User.find_token(token_str);
    assert(token);
    assert((await token.getUser()).email == user1.email);
    await token.invalidate();
    assert(!(await User.find_token(token_str)));

    await retry_login;
    await retry_token;
}

test().catch((err) => {
    console.log(err);
    process.exit(1);
});
