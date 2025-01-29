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

import api from '../lib/api';
import CheckLogin from '../components/CheckLogin';
import GlobalContext from '../components/Global';
import { NotifyContext } from '../components/NotifyMenu';
import Wrapper from '../components/Wrapper';

import Link from 'next/link';
import React from 'react';

export default class Profile extends React.Component {
    static contextType = GlobalContext;
    request_approval = async (e, notify) => {
        e.preventDefault();
        e.stopPropagation();
        let req = api({ request_approval: 'request_approval' });
        notify.add_notify('fas fa-spinner text-yellow', 'Approval requested', '', 20);
        await req;
    }
    render() {
        return <Wrapper>
          <CheckLogin>
            <NotifyContext.Consumer>
              {(ctx) => this.render_real(ctx)}
            </NotifyContext.Consumer>
          </CheckLogin>
        </Wrapper>;
    }
    render_real(notify) {
        let user = this.context.user;
        return <div style={{width: "100%"}}>
          <legend className="text-center">Profile</legend>
          <div className="container">
            <form>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label">Email</label>
                <div className="col-sm-9">
                  <input className="form-control" value={user.email} readOnly/>
                </div>
              </div>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label">Password</label>
                <div className="col-sm-9">
                  <Link href="/change-password" className="btn btn-secondary"
                    style={{color: "#fff"}}>
                    Change password
                  </Link>
                </div>
              </div>
              <div className="form-group row">
                <label className="col-sm-3 col-form-label">
                  { user.approved ? "Approved" : "Not approved" }
                </label>
                <div className="col-sm-9">
                  { user.approved ?
                    <i className="fas fa-check text-green" style={{paddingTop: "9px"}}/> :
                    <button className="btn btn-primary"
                      onClick={(e) => this.request_approval(e, notify)}>Request approval</button>
                  }
                </div>
              </div>
            </form>
          </div>
        </div>;
    }
}
