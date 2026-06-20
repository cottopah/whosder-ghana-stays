const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/chat/session');

function mockResponse(){
  return {statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[name]=value},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
}

test('rejects non-POST requests',async()=>{
  const response=mockResponse();
  await handler({method:'GET',headers:{}},response);
  assert.equal(response.statusCode,405);
});

test('fails closed when live-support secrets are missing',async()=>{
  const response=mockResponse();
  await handler({method:'POST',headers:{},body:{}},response);
  assert.equal(response.statusCode,503);
  assert.equal(response.body.error,'Live support is not configured');
});

test('accepts signed sessions and rejects tampering',()=>{
  const previousSecret=process.env.CHAT_SESSION_SECRET;
  process.env.CHAT_SESSION_SECRET='test-secret-with-at-least-32-characters';
  try{
    const signed=handler._test.createSessionToken({identity:'guest_test',conversationSid:'CH123'});
    assert.equal(handler._test.readSessionToken(signed).identity,'guest_test');
    assert.equal(handler._test.readSessionToken(`${signed.slice(0,-1)}x`),null);
  }finally{
    if(previousSecret===undefined)delete process.env.CHAT_SESSION_SECRET;else process.env.CHAT_SESSION_SECRET=previousSecret;
  }
});
