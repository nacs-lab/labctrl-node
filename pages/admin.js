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

export default class Admin extends React.Component {
    static contextType = GlobalContext;
    static async getInitialProps(ctx) {
        return await api({ all_users: 'all_users' }, ctx);
    }
    constructor(props) {
        super(props);
        this.invite_area = React.createRef();
        this.state = {
            all_users: props.all_users,
            request_only: true
        };
        if (props.all_users) {
            let has_request = false;
            for (let i in props.all_users) {
                let user = props.all_users[i];
                if (user.requested) {
                    has_request = true;
                    break;
                }
            }
            if (!has_request) {
                this.state.request_only = false;
            }
        }
    }
    request_only_change = (e) => {
        this.setState({ request_only: e.target.checked });
    }
    async set_flags(email, flags, i, notify, msg) {
        let res = (await api({ set_flags: { params: { email, flags } } })).set_flags;
        if (!res) {
            notify.add_notify('fas fa-info-circle text-red',
                              msg + ' failed', '', 20);
            return;
        }
        this.setState((state) => {
            if (!state.all_users)
                return null;
            if (state.all_users[i].email != email) {
                let found = false;
                for (let j in state.all_users) {
                    if (state.all_users[j].email != email) {
                        found = true;
                        i = j;
                        break;
                    }
                }
                if (!found) {
                    return null;
                }
            }
            let all_users = [ ...state.all_users ];
            all_users[i] = res;
            return { all_users };
        });
    }
    approve = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { approved: true }, i, notify, 'Approve user');
    }
    revoke_approve = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { approved: false }, i, notify, 'Revoke user');
    }
    ignore_request = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { requested: false }, i, notify, 'Ignore user');
    }
    grant_admin = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { admin: true }, i, notify, 'Grant admin ');
    }
    revoke_admin = async (e, email, i, notify) => {
        e.preventDefault();
        e.stopPropagation();
        this.set_flags(email, { admin: false }, i, notify, 'Revoke admin ');
    }
    invite_users = async (e, notify) => {
        e.preventDefault();
        e.stopPropagation();
        let emails = [];
        let lines = this.invite_area.current.value.split('\n');
        for (let i in lines) {
            let l = lines[i];
            l = l.trim();
            if (!l)
                continue;
            if (l.substr(-1) === ',' || l.substr(-1) === ';')
                l = l.substr(0, l.length - 1).trim();
            if (!l)
                continue;
            emails.push(l);
        }
        if (!emails.length) {
            notify.add_notify('fas fa-info-circle text-red',
                              'No email entered for invitation', '', 20);
            return;
        }
        let res = (await api({ invite: { params: { emails } } })).invite;
        if (!res) {
            notify.add_notify('fas fa-info-circle text-red',
                              'Invitation failed', '', 20);
            return;
        }
        let success = 0;
        for (let i in res) {
            let r = res[i];
            if (r === true) {
                success += 1;
                continue;
            }
            notify.add_notify('fas fa-info-circle text-red',
                              'Cannot invite ' + emails[i], res[i], 20);
        }
        if (success) {
            notify.add_notify('fas fa-check text-green',
                              `Successfully invited ${success} users`, '', 20);
        }
    }
    render() {
        return <Wrapper>
          <CheckLogin admin={true}>
            <NotifyContext.Consumer>
              {ctx => this.render_real(ctx)}
            </NotifyContext.Consumer>
          </CheckLogin>
        </Wrapper>;
    }
    render_real(notify) {
        let user = this.context.user;
        let rows = [];
        let pad = <span style={{paddingRight: "6px"}}/>;
        for (let i in this.state.all_users) {
            let info = this.state.all_users[i];
            let is_self = info.email == user.email;
            if (!info.requested && this.state.request_only)
                continue;
            let ap;
            if (info.approved) {
                ap = <React.Fragment>
                  <span className="fas fa-check text-green"/>
                  {
                      is_self ? '' : <React.Fragment>
                        <span style={{paddingRight: "6px"}}/>
                        <button className="btn btn-danger btn-sm"
                          onClick={(e) => this.revoke_approve(e, info.email, i, notify)}>Revoke</button>
                      </React.Fragment>
                  }
                </React.Fragment>;
            }
            else {
                ap = <React.Fragment>
                  <span className="fas fa-times text-red"/>
                  <span style={{paddingRight: "6px"}}/>
                  <button className="btn btn-success btn-sm"
                    onClick={(e) => this.approve(e, info.email, i, notify)}>Approve</button>
                </React.Fragment>;
            }
            let req = '';
            if (info.requested) {
                req = <React.Fragment>
                  <span className="fas fa-info text-blue"/>
                  {
                      <React.Fragment>
                        <span style={{paddingRight: "6px"}}/>
                        <button className="btn btn-danger btn-sm"
                          onClick={(e) => this.ignore_request(e, info.email, i, notify)}>Ignore</button>
                      </React.Fragment>
                  }
                </React.Fragment>;
            }
            let ad;
            if (is_self) {
                ad = <span className="fas fa-check text-green"/>;
            }
            else if (info.admin) {
                ad = <React.Fragment>
                  <span className="fas fa-check text-green"/>
                  <span style={{paddingRight: "6px"}}/>
                  <button className="btn btn-danger btn-sm"
                    onClick={(e) => this.revoke_admin(e, info.email, i, notify)}>Revoke admin</button>
                </React.Fragment>;
            }
            else {
                ad = <button className="btn btn-info btn-sm"
                       onClick={(e) => this.grant_admin(e, info.email, i, notify)}>Grant admin</button>;
            }
            rows.push(<tr key={i}>
              <th scope="row">{info.email}</th>
              <td>{ap}</td>
              <td>{req}</td>
              <td>{ad}</td>
            </tr>);
        }
        return <div style={{width: "100%"}}>
          <legend className="text-center">Manage Users</legend>
          <label className="text-center checkbox-inline" style={{width: "100%"}}>
            <input type="checkbox" checked={this.state.request_only}
              onChange={this.request_only_change}/>Only show requested
          </label>
          <div style={{width: "100%", overflowX: "scroll"}}>
            <table className="table table-striped table-hover"
              style={{whiteSpace: "nowrap"}}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Approved</th>
                  <th>Request</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {rows}
              </tbody>
            </table>
          </div>
          <legend className="text-center">Invitations</legend>
          <div style={{margin: "8px"}} className="text-center">
            <textarea style={{width: "100%", resize: "vertical"}}
              placeholder="One email per line"
              ref={this.invite_area}/>
            <span style={{padding: "6px"}}/>
            <button className="btn btn-sm btn-primary"
              style={{minWidth: "50%"}}
              onClick={(e) => this.invite_users(e, notify)}>Invite</button>
          </div>
        </div>;
    }
}
