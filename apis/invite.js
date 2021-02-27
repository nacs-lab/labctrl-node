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
const Email = require('../server/email');
const { absolute_url } = require('../server/url');
const { validate_email } = require('../lib/account');

async function send_invite_email(user, req) {
    let maxage = 2 * 24 * 60 * 60 * 1000; // 2 days
    let expires = new Date(Date.now() + maxage);
    let token = await user.new_token(User.Token.Invitation, expires);
    let url = absolute_url(req, '/verify/' + token);
    await Email.send({
        to: user.email,
        subject: "Lab control account invitation",
        text: `
Hello ${user.email},

You are invited to join Lab Control.

Please confirm your account (${user.email}) at ${url}.
You'll be asked to set you password after confirmation.

Cheers,

LabControl`,
        html: `
          <h3>Hello ${user.email},</h3>

          <p>You are invited to join Lab Control.</p>

          <p>
            In order to confirm your account (${user.email}),
            please <a href="${url}">click here</a>
            or copy and paste the following URL into your browser:
            <i>
              (Note: be sure to copy the entire URL,
              including any part of it which goes onto a second line.)
            </i>
          </p>

          <b>${url}</b>

          <p>Cheers,</p>

          <p>LabControl</p>`});
}

async function invite_user(email, reinvite) {
    if (reinvite) {
        let user = await User.find_user(email);
        if (!user)
            return 'User do not exist.';
        return user;
    }
    if (!email || !validate_email(email))
        return 'Invalid email address.';
    let user = await User.invite(email);
    if (!user) {
        if (await User.find_user(email))
            return 'Email address already registered.';
        return 'Unknown error.';
    }
    return user;
}

module.exports = async ({ req }, params) => {
    if (!req.nacs_user || !req.nacs_user.admin || !params || !params.emails)
        return null;
    let res = [];
    for (let i in params.emails) {
        let email = params.emails[i];
        let r = await invite_user(email, params.reinvite);
        if (typeof(r) === 'string') {
            res.push(r);
        }
        else {
            send_invite_email(r, req);
            res.push(true);
        }
    }
    return res;
};
