// Add the full international business number (digits only) before production.
const WHATSAPP_NUMBER='';
const supportLauncher=document.querySelector('#supportLauncher');
const supportPanel=document.querySelector('#supportPanel');
const supportClose=document.querySelector('#supportClose');
const supportForm=document.querySelector('#supportForm');
const supportInput=document.querySelector('#supportInput');
const supportMessages=document.querySelector('#supportMessages');
const whatsappLink=document.querySelector('#whatsappLink');
let latestQuestion='Hello, I have a question about a stay in Accra.';

const supportAnswers=[
 {terms:['available','availability','dates','book'],reply:'Choose your check-in and check-out dates on a property page to see the booking total. A reservation is confirmed only after secure payment succeeds.'},
 {terms:['pay','payment','card','momo','money'],reply:'We support credit and debit cards plus mobile money through a secure external payment provider. Never send payment credentials or verification codes in chat.'},
 {terms:['check-in','check in','arrival','time'],reply:'Check-in details are provided with the confirmed reservation. Standard check-in is from 3:00 PM; ask us on WhatsApp if you need an earlier arrival.'},
 {terms:['cancel','refund','cancellation'],reply:'Cancellation terms can differ by property and booking dates. Review the terms before payment, or send your property and dates through WhatsApp for confirmation.'},
 {terms:['wifi','amenities','pool','kitchen'],reply:'Each property page lists its included amenities. Tell me the property name and the amenity you need, and our support team can confirm it.'},
 {terms:['location','where','airport','accra'],reply:'Our homes are in selected Accra neighborhoods including Cantonments, Airport Residential, and East Legon. Exact arrival details are shared securely after booking.'},
 {terms:['account','login','password'],reply:'Guest accounts keep reservations together. For your security, never share passwords or one-time codes; support will never ask for them.'}
];

function updateWhatsApp(){const text=encodeURIComponent(`Hello Whosder Ghana Stays, ${latestQuestion}`);whatsappLink.href=WHATSAPP_NUMBER?`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`:`https://wa.me/?text=${text}`}
function addSupportMessage(text,type){const item=document.createElement('div');item.className=`support-message ${type}`;item.textContent=text;supportMessages.append(item);supportMessages.scrollTop=supportMessages.scrollHeight}
function answerQuestion(question){const normalized=question.toLowerCase();const match=supportAnswers.find(item=>item.terms.some(term=>normalized.includes(term)));return match?.reply||'I may need a person to help with that. Continue on WhatsApp and your question will be included automatically.'}
function sendQuestion(question){const clean=question.trim().slice(0,300);if(!clean)return;latestQuestion=clean;addSupportMessage(clean,'guest');updateWhatsApp();window.setTimeout(()=>addSupportMessage(answerQuestion(clean),'bot'),250)}
function toggleSupport(open){supportPanel.classList.toggle('hidden',!open);supportLauncher.setAttribute('aria-expanded',String(open));if(open)supportInput.focus()}

supportLauncher.addEventListener('click',()=>toggleSupport(supportPanel.classList.contains('hidden')));
supportClose.addEventListener('click',()=>toggleSupport(false));
supportForm.addEventListener('submit',event=>{event.preventDefault();sendQuestion(supportInput.value);supportInput.value=''});
document.querySelectorAll('#supportPrompts button').forEach(button=>button.addEventListener('click',()=>sendQuestion(button.textContent)));
updateWhatsApp();
