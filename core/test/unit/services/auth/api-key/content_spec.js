const common = require('../../../../../server/lib/common');
const {authenticateContentApiKey} = require('../../../../../server/services/auth/api-key/content');
const models = require('../../../../../server/models');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../utils');

const sandbox = sinon.sandbox.create();

describe('Content API Key Auth', function () {
    before(models.init);
    before(testUtils.teardown);

    this.beforeEach(function () {
        const fakeApiKey = {
            id: '1234',
            type: 'content',
            secret: Buffer.from('testing').toString('hex'),
            get(prop) {
                return this[prop];
            }
        };
        this.fakeApiKey = fakeApiKey;

        this.apiKeyStub = sandbox.stub(models.ApiKey, 'findOne');
        this.apiKeyStub.returns(new Promise.resolve());
        this.apiKeyStub.withArgs({secret: fakeApiKey.secret}).returns(new Promise.resolve(fakeApiKey));
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should authenticate with known+valid key', function (done) {
        const req = {
            query: {
                key: this.fakeApiKey.secret
            }
        };
        const res = {};

        authenticateContentApiKey(req, res, (arg) => {
            should.not.exist(arg);
            req.api_key.should.eql(this.fakeApiKey);
            done();
        });
    });

    it('shouldn\'t authenticate with invalid/unknown key', function (done) {
        const req = {
            query: {
                key: 'unknown'
            }
        };
        const res = {};

        authenticateContentApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('UNKNOWN_CONTENT_API_KEY');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with a non-content-api key', function (done) {
        const req = {
            query: {
                key: this.fakeApiKey.secret
            }
        };
        const res = {};

        this.fakeApiKey.type = 'admin';

        authenticateContentApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_API_KEY_TYPE');
            should.not.exist(req.api_key);
            done();
        });
    });
});
