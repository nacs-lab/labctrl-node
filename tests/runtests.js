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

const path = require('path');

process.env.NODE_ENV = 'development';
if (!process.env.NODE_CONFIG_DIR)
    process.env.NODE_CONFIG_DIR = path.resolve(process.cwd(), 'tests', 'conf');
if (!process.env.LABCTRL_LIB_DIR)
    process.env.LABCTRL_LIB_DIR = path.resolve(process.cwd(), 'addon');

process.chdir(path.join(__dirname, '..'));

const all_tests = ['user'];
tests = process.argv.slice(2);
if (tests.length == 0)
    tests = all_tests;

const old_env = { ...process.env };

async function run_tests(tests) {
    for (let i in tests) {
        await require('./' + tests[i])();
        process.env = old_env;
    }
}

run_tests(tests).catch((err) => {
    console.log(err);
    process.exit(1);
});
