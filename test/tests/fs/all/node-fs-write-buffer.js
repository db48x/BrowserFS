// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var fs = require('fs'),
    path = require('path'),
    assert = require('wrapped-assert'),
    common = require('../../../harness/common'),
    Buffer = require('buffer').Buffer;

module.exports = function() {
  if (!fs.getRootFS().isReadOnly()) {
    var filename = path.join(common.tmpDir, 'write.txt'),
        expected = new Buffer('hello'),
        openCalled = 0,
        writeCalled = 0;


    fs.open(filename, 'w', 0644, function(err, fd) {
      openCalled++;
      if (err) throw err;

      fs.write(fd, expected, 0, expected.length, null, function(err, written) {
        writeCalled++;
        if (err) throw err;

        assert.equal(expected.length, written);
        fs.close(fd, function(err) {
          if (err) throw err;
          fs.readFile(filename, 'utf8', function(err, found) {
            assert.deepEqual(expected.toString(), found);
            fs.unlink(filename, function(err) {
              if (err) throw err;
            });
          });
        });
      });
    });

    process.on('exit', function() {
      assert.equal(1, openCalled);
      assert.equal(1, writeCalled);
    });
  }
};
