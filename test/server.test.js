const chai = require('chai');
const assert = chai.assert;
const chaiHttp = require('chai-http');
const server = require('../server');

// chai.use(chaiHttp);

const expect = chai.expect;

describe('Loading the home page', () => {
  it('Should load successfully, and display Manhattan Country School Map', (done) => {
    server.inject({
      method: 'GET',
      url: '/'
    }, (err, response) => {
      expect(res).to.have.status(200);
      console.log({err, response});
    });
    // chai.request(server)
    //   .get('/')
    //   .end((err, res) => {
        
    //     // expect(res.body.result).to.equal(5);
    //     done();
    //   });
  });
});
