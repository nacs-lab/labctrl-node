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
        return null;
    let token = await User.find_token(params.token);
    if (!token)
        return null;
    let user = await token.getUser();
    let type = token.type;
    if (type == User.Token.Verification) {
        await user.verify();
        await token.invalidate();
    }
    else if (type == User.Token.Invitation ||
             type == User.Token.ResetPassword) {
        // These allows the user to update password so we need to keep the token valid until
        // the user set the new password.
        let maxage = User.min_login_time;
        let expires = new Date(Date.now() + maxage);
        let token = await user.new_token(User.Token.LoginSession, expires);
        if (token) {
            // TODO secure
            res.cookie('nacs_user', token, { expires, httpOnly: true });
        }
    }
    else {
        return null;
    }
    return { type, user: user.info() };
};
