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

const User = require('../server/user');

module.exports = async ({ req, res }, params) => {
    if (req.nacs_user)
        return req.nacs_user;
    let user = await User.login(params.email, params.password);
    if (!user)
        return user;
    let maxage = (params.remember ? User.min_login_time_long : User.min_login_time) * 1.5;
    let token_type = params.remember ? User.Token.LoginSessionLong : User.Token.LoginSession;
    let expires = new Date(Date.now() + maxage);
    let token = await user.new_token(token_type, expires);
    if (token)
        // TODO secure
        res.cookie('nacs_user', token, { expires, httpOnly: true, sameSite: true });
    return user.info();
};
