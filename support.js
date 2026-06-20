const supportWidget=document.querySelector('#supportWidget');
const supportLauncher=document.querySelector('#supportLauncher');
const supportPanel=document.querySelector('#supportPanel');
const supportClose=document.querySelector('#supportClose');
const supportForm=document.querySelector('#supportForm');
const supportInput=document.querySelector('#supportInput');
const supportMessages=document.querySelector('#supportMessages');
let conversationsClient=null;
let liveConversation=null;
let liveIdentity=null;
let liveConnectionPromise=null;
let liveHistoryLoaded=false;

const supportAnswers=[
 {terms:['available','availability','dates','book'],reply:'Choose your check-in and check-out dates on a property page to see the booking total. A reservation is confirmed only after secure payment succeeds.'},
 {terms:['pay','payment','card','momo','money'],reply:'We support credit and debit cards plus mobile money through a secure external payment provider. Never send payment credentials or verification codes in chat.'},
 {terms:['check-in','check in','arrival','time'],reply:'Check-in details are provided with the confirmed reservation. Standard check-in is from 3:00 PM; tell me if you need an earlier arrival and I can ask the host.'},
 {terms:['cancel','refund','cancellation'],reply:'Cancellation terms can differ by property and booking dates. Review the terms before payment, or tell me the property and dates so I can ask the host.'},
 {terms:['wifi','amenities','pool','kitchen'],reply:'Each property page lists its included amenities. Tell me the property name and the amenity you need, and our support team can confirm it.'},
 {terms:['location','where','airport','accra'],reply:'Our homes are in selected Accra neighborhoods including Cantonments, Airport Residential, and East Legon. Exact arrival details are shared securely after booking.'},
 {terms:['account','login','password'],reply:'Guest accounts keep reservations together. For your security, never share passwords or one-time codes; support will never ask for them.'}
];

function addSupportMessage(text,type){const item=document.createElement('div');item.className=`support-message ${type}`;item.textContent=text;supportMessages.append(item);supportMessages.scrollTop=supportMessages.scrollHeight}
function answerQuestion(question){const normalized=question.toLowerCase();return supportAnswers.find(item=>item.terms.some(term=>normalized.includes(term)))?.reply||null}
async function requestLiveSession(){
  const response=await fetch('/api/chat/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken:sessionStorage.getItem('whosder-chat-session')})});
  if(!response.ok)throw new Error('Live support is unavailable');
  const session=await response.json();
  sessionStorage.setItem('whosder-chat-session',session.sessionToken);
  return session;
}
async function refreshLiveToken(){const session=await requestLiveSession();await conversationsClient.updateToken(session.accessToken)}
async function connectLiveSupport(){
  if(liveConversation)return liveConversation;
  if(liveConnectionPromise)return liveConnectionPromise;
  liveConnectionPromise=(async()=>{
    if(!window.Twilio?.Conversations?.Client)throw new Error('Chat service did not load');
    const session=await requestLiveSession();
    liveIdentity=session.identity;
    conversationsClient=await window.Twilio.Conversations.Client.create(session.accessToken);
    conversationsClient.on('tokenAboutToExpire',()=>refreshLiveToken().catch(()=>addSupportMessage('The secure chat session needs to reconnect. Please send your message again.','system')));
    liveConversation=await conversationsClient.getConversationBySid(session.conversationSid);
    liveConversation.on('messageAdded',message=>{if(message.author!==liveIdentity&&message.body)addSupportMessage(`Host: ${message.body}`,'host')});
    if(!liveHistoryLoaded){const history=await liveConversation.getMessages(30);history.items.forEach(message=>{if(message.body)addSupportMessage(message.author===liveIdentity?message.body:`Host: ${message.body}`,message.author===liveIdentity?'guest':'host')});liveHistoryLoaded=true}
    return liveConversation;
  })();
  try{return await liveConnectionPromise}finally{liveConnectionPromise=null}
}
async function escalateToHost(question){
  addSupportMessage('I’m bringing the host into this chat. You can stay on this page; their reply will appear here.','system');
  try{const conversation=await connectLiveSupport();await conversation.sendMessage(question)}catch{addSupportMessage('Live host support is not connected yet. Please try again shortly.','system')}
}
async function sendQuestion(question){
  const clean=question.trim().slice(0,300);if(!clean)return;
  addSupportMessage(clean,'guest');
  if(liveConversation||sessionStorage.getItem('whosder-chat-session')){try{const conversation=await connectLiveSupport();await conversation.sendMessage(clean)}catch{addSupportMessage('Your message could not be delivered. Please try again.','system')}return}
  const answer=answerQuestion(clean);
  if(answer)window.setTimeout(()=>addSupportMessage(answer,'bot'),250);else await escalateToHost(clean);
}
function toggleSupport(open){supportWidget.classList.toggle('is-open',open);supportPanel.classList.toggle('hidden',!open);supportLauncher.setAttribute('aria-expanded',String(open));supportLauncher.setAttribute('aria-label',open?'Close guest support chat':'Open guest support chat');if(open){supportInput.focus();if(sessionStorage.getItem('whosder-chat-session')&&!liveConversation)connectLiveSupport().catch(()=>addSupportMessage('The previous host conversation could not be restored.','system'))}}

supportLauncher.addEventListener('click',()=>toggleSupport(supportPanel.classList.contains('hidden')));
supportClose.addEventListener('click',()=>toggleSupport(false));
supportForm.addEventListener('submit',event=>{event.preventDefault();const question=supportInput.value;supportInput.value='';sendQuestion(question)});
document.querySelectorAll('#supportPrompts button').forEach(button=>button.addEventListener('click',()=>sendQuestion(button.textContent)));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&supportWidget.classList.contains('is-open'))toggleSupport(false)});
document.addEventListener('click',event=>{if(supportWidget.classList.contains('is-open')&&!supportWidget.contains(event.target))toggleSupport(false)});
