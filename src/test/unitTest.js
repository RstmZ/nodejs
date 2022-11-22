const chai = require('chai');
const chaiHttp = require('chai-http');
let should = chai.should();

require('dotenv').config();

const { TYPE_DEVELOPER } = process.env

const link = TYPE_DEVELOPER == 'dev' ? 'localhost:8080' : 'https://app.prai.co/api/'

chai.use(chaiHttp);

let cookie = ''

describe('/GET prices', () => {
    it('it should POST authorization', (done) => {
        chai.request(link)
            .post('/auth/login')
            .send({
                "email": "test@gmail.com",
                "password": "qweqweqweqwe"
            })
            .end((err, res) => {
                cookie = res.headers["set-cookie"][0];
                res.should.have.status(200);
                // res.body.should.be.a('array');
                done();
            });
    });
    it('it should GET all the prices', (done) => {
        chai.request(link)
            .get('/stripe/prices')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                done();
            });
    });
});

// describe('/GET campaign', () => {
//     it('it should POST authorization', (done) => {
//         chai.request(link)
//             .post('/auth/login')
//             .send({
//                 "email": "test@gmail.com",
//                 "password": "qweqweqweqwe"
//             })
//             .end((err, res) => { 
//                 cookie = res.headers["set-cookie"][0]; 
//                 res.should.have.status(200);
//                 // res.body.should.be.a('array');
//                 done();
//             });
//     });

//     it('it should GET all the campaign', (done) => {
//         chai.request(link)
//             .get('/campaign/')
//             .set({
//                 Cookie: cookie
//             })
//             .end((err, res) => { 
//                 res.should.have.status(200);
//                 res.body.rows.should.be.a('array');
//                 done();
//             });
//     });

//     it('it should GET campaign by id', (done) => {
//         chai.request(link)
//             .get('/campaign/1347')
//             .set({
//                 Cookie: cookie
//             })
//             .end((err, res) => { 
//                 res.should.have.status(200);
//                 res.body.should.be.a('object');
//                 res.body.should.have.property('title');
//                 // res.body.should.have.property('pitch');

//                 // res.body.pitch.should.have.property('pitchTitle');
//                 done();
//             });
//     });

//     it('it should GET campaigns for dashboard', (done) => {
//         chai.request(link)
//             .get('/dashboard/campaigns')
//             .set({
//                 Cookie: cookie
//             })
//             .end((err, res) => {  
//                 res.should.have.status(200);
//                 res.body.should.be.a('array'); 
//                 done();
//             });

//     });
//     it('it should GET last campaigns for dashboard', (done) => {
//         chai.request(link)
//             .get('/dashboard/lastCampaigns')
//             .set({
//                 Cookie: cookie
//             })
//             .end((err, res) => {  
//                 res.should.have.status(200);
//                 res.body.should.be.a('array'); 
//                 done();
//             });
//     });
// });


// describe('/GET lists', () => {
//     it('it should POST authorization', (done) => {
//         if(!cookie){
//             chai.request(link)
//             .post('/auth/login')
//             .send({
//                 "email": "test@gmail.com",
//                 "password": "qweqweqweqwe"
//             })
//             .end((err, res) => { 
//                 cookie = res.headers["set-cookie"][0]; 
//                 res.should.have.status(200);
//                 // res.body.should.be.a('array');
//                 done();
//             });
//         }else {
//             done()
//         }

//     });

//     it('it should GET all the lists', (done) => {
//         chai.request(link)
//             .get('/lists/')
//             .set({
//                 Cookie: cookie
//             })
//             .end((err, res) => { 
//                 res.should.have.status(200);
//                 res.body.rows.should.be.a('array');
//                 done();
//             });
//     });

//     it('it should GET lists by id', (done) => {
//         chai.request(link)
//             .post('/lists/162')
//             .set({
//                 Cookie: cookie
//             })
//             .end((err, res) => {  
//                 res.should.have.status(200);
//                 res.body.should.be.a('object');
//                 res.body.rows.should.be.a('array');
//                 done();
//             });
//     });

// })


describe('/GET contacts', () => {
    it('it should GET all the contacts', (done) => {
        chai.request(link)
            .post('/contacts/?page=1&limit=10&sort=createdAt&param=ASC')
            .set({
                Cookie: cookie
            })
            .end((err, res) => { 
                res.should.have.status(200);
                res.body.rows.should.be.a('array');
                done();
            });
    });

    // it('it should GET contacts by id', (done) => {
    //     chai.request(link)
    //         .get('/contacts/51446')
    //         .set({
    //             Cookie: cookie
    //         })
    //         .end((err, res) => {  
    //             res.should.have.status(200);
    //             res.body.should.be.a('object'); 
    //             done();
    //         });
    // });

})