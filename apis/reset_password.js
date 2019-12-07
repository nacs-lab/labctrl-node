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

async function send_reset_email(user, req) {
    let maxage = 2 * 60 * 60 * 1000; // 2 hours
    let expires = new Date(Date.now() + maxage);
    let token = await user.new_token(User.Token.ResetPassword, expires);
    let url = absolute_url(req, '/verify/' + token);
    await Email.send({
        to: user.email,
        subject: "Lab control password reset",
        text: `
Hello ${user.email},

We recieved a request to reset your password for your LabControl accout.

If you requested this, please choose a new password by clicking here
or copying the URL into your browser. If you didn't
request this, you can safely ignore and discard this email.
(Note: be sure to copy the entire URL, including any part of it which goes onto
a second line.)

${url}

Cheers,

LabControl`,
        html: `
          <h3>Hello ${user.email},</h3>

          <p>We recieved a request to reset your password for your LabControl accout.</p>

          <p>
            If you requested this, please choose a new password by
            <a href="${url}">clicking here</a> or copying the URL into your browser.
            If you didn't request this, you can safely ignore and discard this email.
            <i>
              (Note: be sure to copy the entire URL,
              including any part of it which goes onto a second line.)
            </i>
          </p>

          <b>${url}</b>

          <p>Cheers,</p>

          <p>LabControl</p>`});
}

module.exports = async ({ req, res }, params) => {
    if (req.nacs_user)
        return { email_msg: 'Already logged in. Please logout before resetting password.' };
    if (!params || !params.email)
        return { email_msg: 'Email cannot be empty.' };
    // Only do minimum check on the input and always return the same result no matter
    // if the account exist or not in order not to leak any information about
    // existing accounts.
    let email = params.email;
    let user = await User.find_user(email);
    if (user)
        send_reset_email(user, req);
    return true;
};
