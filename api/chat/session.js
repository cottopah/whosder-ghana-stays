const crypto=require('crypto');
const twilio=require('twilio');

const requiredEnvironment=[
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_CONVERSATIONS_SERVICE_SID',
  'TWILIO_WHATSAPP_NUMBER',
  'SUPPORT_WHATSAPP_NUMBER',
  'CHAT_SESSION_SECRET'
];
const sessionAttempts=globalThis.__whosderSessionAttempts||(globalThis.__whosderSessionAttempts=new Map());
const rateLimitWindowMs=10*60*1000;
const rateLimitMaximum=5;

function encode(value){return Buffer.from(value).toString('base64url')}
function signature(payload){return crypto.createHmac('sha256',process.env.CHAT_SESSION_SECRET).update(payload).digest('base64url')}
function createSessionToken(session){const payload=encode(JSON.stringify({...session,expiresAt:Date.now()+24*60*60*1000}));return `${payload}.${signature(payload)}`}
function readSessionToken(token){
  if(typeof token!=='string'||!token.includes('.'))return null;
  const [payload,suppliedSignature]=token.split('.');
  const expectedSignature=signature(payload);
  if(suppliedSignature.length!==expectedSignature.length||!crypto.timingSafeEqual(Buffer.from(suppliedSignature),Buffer.from(expectedSignature)))return null;
  try{const session=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return session.expiresAt>Date.now()?session:null}catch{return null}
}
function clientKey(request){const forwarded=request.headers['x-vercel-forwarded-for']||request.headers['x-forwarded-for']||request.socket?.remoteAddress||'unknown';return crypto.createHash('sha256').update(String(forwarded).split(',')[0].trim()).digest('hex')}
function mayCreateSession(request){
  const now=Date.now();
  if(sessionAttempts.size>1000){for(const [storedKey,timestamps] of sessionAttempts){if(!timestamps.some(timestamp=>now-timestamp<rateLimitWindowMs))sessionAttempts.delete(storedKey)}}
  const key=clientKey(request);
  const recent=(sessionAttempts.get(key)||[]).filter(timestamp=>now-timestamp<rateLimitWindowMs);
  if(recent.length>=rateLimitMaximum){sessionAttempts.set(key,recent);return false}
  recent.push(now);sessionAttempts.set(key,recent);return true;
}
function createAccessToken(identity){
  const AccessToken=twilio.jwt.AccessToken;
  const token=new AccessToken(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_API_KEY,process.env.TWILIO_API_SECRET,{identity,ttl:3600});
  token.addGrant(new AccessToken.ConversationsGrant({serviceSid:process.env.TWILIO_CONVERSATIONS_SERVICE_SID}));
  return token.toJwt();
}
async function createConversation(){
  const client=twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN);
  const service=client.conversations.v1.services(process.env.TWILIO_CONVERSATIONS_SERVICE_SID);
  const identity=`guest_${crypto.randomUUID().replaceAll('-','')}`;
  const conversation=await service.conversations.create({friendlyName:`Website support ${new Date().toISOString()}`});
  await conversation.participants().create({identity});
  await conversation.participants().create({
    'messagingBinding.address':process.env.SUPPORT_WHATSAPP_NUMBER,
    'messagingBinding.proxyAddress':process.env.TWILIO_WHATSAPP_NUMBER
  });
  return {identity,conversationSid:conversation.sid};
}

async function handler(request,response){
  if(request.method!=='POST')return response.status(405).json({error:'Method not allowed'});
  if(requiredEnvironment.some(name=>!process.env[name]))return response.status(503).json({error:'Live support is not configured'});
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  try{
    const existing=readSessionToken(request.body?.sessionToken);
    if(!existing&&!mayCreateSession(request)){response.setHeader('Retry-After','600');return response.status(429).json({error:'Too many support sessions'})}
    const session=existing||await createConversation();
    return response.status(200).json({
      accessToken:createAccessToken(session.identity),
      conversationSid:session.conversationSid,
      identity:session.identity,
      sessionToken:createSessionToken(session)
    });
  }catch(error){
    console.error('Unable to create support session',error?.code||error?.message);
    return response.status(502).json({error:'Unable to connect live support'});
  }
}

module.exports=handler;
module.exports._test={createSessionToken,readSessionToken};
