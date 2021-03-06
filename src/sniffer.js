/*
 *  This file is part of the OpenLink Structured Data Sniffer
 *
 *  Copyright (C) 2015 OpenLink Software
 *
 *  This project is free software; you can redistribute it and/or modify it
 *  under the terms of the GNU General Public License as published by the
 *  Free Software Foundation; only version 2 of the License, dated June 1991.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 *  General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 */

var $ = jQuery;
var micro_items = 0;
var json_ld_Text = null;
var turtle_Text = null;
var rdfa_subjects = null;
var data_found = false;


function is_data_exist() {
  try {

    data_found = false;

    var items = $('[itemscope]').not($('[itemscope] [itemscope]'));
    if (items && items.length > 0) {
      data_found = true;
      return;
    }

    var all = document.getElementsByTagName("script");
    for( var i = 0; i < all.length; i++ ) {
      if ( all[i].hasAttribute('type') 
           && all[i].getAttribute('type') == "application/ld+json")
        {
          data_found = true;
          return;
        }
    }

    for( var i = 0; i < all.length; i++ ) {
      if ( all[i].hasAttribute('type') 
           && all[i].getAttribute('type') == "text/turtle")
        {
          data_found = true;
          return;
        }
    }

    try {
      GreenTurtle.attach(document);
      rdfa_subjects = document.data.getSubjects();
    } catch(e) {
      console.log("OSDS:"+e);
    }

    if (rdfa_subjects && rdfa_subjects.length>0)
      data_found = true;

  } catch (e) {
    console.log("OSDS:"+e);
  }

}


function sniff_Data() {
  try {

    micro_items = $('[itemscope]').not($('[itemscope] [itemscope]'));

    try {
      GreenTurtle.attach(document);
      rdfa_subjects = document.data.getSubjects();
    } catch(e) {
      console.log("OSDS:"+e);
    }

    json_ld_Text = null;
    var all = document.getElementsByTagName("script");
    for( var i = 0; i < all.length; i++ ) {
      if ( all[i].hasAttribute('type') 
           && all[i].getAttribute('type') == "application/ld+json")
        {
          var htmlText = all[i].innerHTML;
          if (json_ld_Text == null)
            json_ld_Text = [];
          json_ld_Text.push(htmlText.replace("<![CDATA[", "").replace("]]>", ""));
        }
    }

    turtle_Text = null;
    for( var i = 0; i < all.length; i++ ) {
      if ( all[i].hasAttribute('type') 
           && all[i].getAttribute('type') == "text/turtle")
        {
          var htmlText = all[i].innerHTML;
          if (turtle_Text == null)
            turtle_Text = [];
          turtle_Text.push(htmlText.replace("<![CDATA[", "").replace("]]>", "")); 
        }
    }

  } catch (e) {
    console.log("OSDS:"+e);
  }

}





window.onload = function() {

  try {

    is_data_exist();
    if (!data_found) {
       setTimeout(is_data_exist, 3000);
    }

    function send_doc_data() 
    {
        //check again ld+json and turtle for any case
        sniff_Data();

        var docData = {
               docURL: document.location.href,
               micro :{ data:null }, 
               jsonld :{ text:null },
               rdfa :{ data:null },
               turtle :{ text:null }
             };
        
        var microdata = jQuery.microdata.json(micro_items, function(o) { return o; });
        var rdfa = null;

        ///Convert RDFa data to internal format
        if (rdfa_subjects!=null && rdfa_subjects.length>0) 
        {
           rdfa = [];
           var _LiteralMatcher = /^"([^]*)"(?:\^\^(.+)|@([\-a-z]+))?$/i;

           for(var i=0; i<rdfa_subjects.length; i++) {
             var s = {s:rdfa_subjects[i], n:i+1};
             rdfa.push(s);
             var plist = document.data.getProperties(rdfa_subjects[i]);
             s.props = new Object();
            
             for(var j=0; j < plist.length; j++) {
               var p = s.props[plist[j]];
               if (p === undefined)
                 s.props[plist[j]] = [];

               p = s.props[plist[j]];

               var vlist = document.data.getObjects(rdfa_subjects[i], plist[j]);
               for (var z=0; z<vlist.length; z++) {
                 var v = vlist[z];
                 if (v.type === "http://www.w3.org/1999/02/22-rdf-syntax-ns#object") {
                   p.push({"iri": String(v.value)});
                 }
                 else if (v.type === "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral") {
                   var v_val = v.value!=null?String(v.value):null;
                   var v_lang = v.language!=null?String(v.language):null;
                   p.push({value:v_val, type:null, lang:v_lang});
                 }
                 else {
                   var v_val = v.value!=null?String(v.value):null;
                   var v_lang = v.language!=null?String(v.language):null;
                   var v_type = v.type!=null?String(v.type):null;
                   p.push({value:v_val, type:v_type, lang:v_lang});
                 }
               }
             }
           } 
        }

        docData.micro.data = microdata;
        docData.jsonld.text = json_ld_Text;
        docData.turtle.text = turtle_Text;
        docData.rdfa.data = rdfa;

        //send data to extension
        if (Browser.isFirefoxSDK) 
        {
            self.port.emit("doc_data", {data:JSON.stringify(docData, undefined, 2)});
        }
        else
        {
            chrome.runtime.sendMessage(null, 
                { property: "doc_data", 
                  data: JSON.stringify(docData, undefined, 2)
                }, 
                function(response) {
            });
        }
    }



    // wait data req from extension 
    if (Browser.isFirefoxSDK) 
    {
        self.port.on("doc_data", function(msg) {
          send_doc_data();
        });
    }
    else 
    {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
          if (request.property == "doc_data") 
            send_doc_data();
          else
            sendResponse({});  /* stop */
        });
    }



    // Tell the chrome extension that we're ready to receive messages
    //send data_exists flag to extension
    if (Browser.isFirefoxSDK) 
    {
        self.port.emit("content_status", {data_exists:data_found});
    }
    else
    {
        chrome.runtime.sendMessage(null, {
               property: "status", 
               status: 'ready',
               data_exists: data_found
           }, 
           function(response) {
        });
     }

  } catch (e) {
    console.log("OSDS:"+e);
  }

}();

