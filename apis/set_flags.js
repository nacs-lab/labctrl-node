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

function full_info(user) {
    let info = user.info();
    info.requested = user.requested;
    return info;
}

module.exports = async ({ req }, params) => {
    if (!req.nacs_user || !req.nacs_user.admin || !params)
        return null;
    let email = params.email;
    let flags = params.flags;
    // Any actual change on one's own account here will always remove the admin privilege.
    // Do not allow changing one's own permission in order to help
    // avoiding no admin left in the system.
    // (one can still get that intentionally by creating a race condition
    //  but this should help avoiding unintentional errors)
    if (!email || !flags || email === req.nacs_user.email)
        return null;
    let user = await User.find_user(email);
    if (!user)
        return null;
    if (('requested' in flags) && !flags.requested)
        return full_info(await user.ignore());
    if ('approved' in flags)
        return full_info(await user.set_approved(flags.approved));
    if ('admin' in flags)
        return full_info(await user.set_admin(flags.admin));
    return null;
};
