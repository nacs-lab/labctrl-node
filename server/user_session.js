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

const User = require('./user');
const config = require('./config');

async function try_set_user(req, res) {
    let user_cookie = req.cookies.nacs_user;
    if (!user_cookie)
        return;
    let token = await User.find_token(user_cookie);
    if (!token || (token.type != User.Token.LoginSession &&
                   token.type != User.Token.LoginSessionLong)) {
        if (res && res.clearCookie) {
            res.clearCookie('nacs_user', { httpOnly: true, secure: config.https });
        }
        return;
    }
    let min_login_time = token.type == User.Token.LoginSessionLong ?
                         User.min_login_time_long : User.min_login_time;
    let min_time = Date.now() + min_login_time;
    if (token.expires < min_time) {
        let new_expire = new Date(min_time);
        await token.update_expire(new_expire);
        // If we are setting user token on a socket.io socket, we won't
        // have the reply available or be able to extend the expiration time of
        // the socket.
        if (res && res.cookie) {
            res.cookie('nacs_user', user_cookie,
                       { expires: new_expire, httpOnly: true,
                         sameSite: 'lax', secure: config.https });
        }
    }
    req.nacs_user_token = token;
    req.nacs_user = await token.getUser();
}

module.exports = async (req, res, next) => {
    // Ignore error.
    await try_set_user(req, res).catch(() => {});
    return next();
};
