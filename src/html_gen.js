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
  

  HTML_Gen = function() {
    this.ns = new Namespace();
    this.uimode = "";
    this.SubjName = "Subject";
    this.PredName = "Predicate";
    this.ObjName  = "Object";
  };

  HTML_Gen.prototype = {

    load: function (n_data, start_id) 
    {
      var expanded = null;
      var id_list = {};

      if (start_id===undefined)
        start_id = 0;

      this.uimode = localStorage.getItem("ext.osds.uiterm.mode");
      if (this.uimode===null)
        this.uimode = "ui-eav";

      if (this.uimode === "ui-eav") 
      {
        this.SubjName = "Entity";
        this.PredName = "Attribute";
        this.ObjName  = "Value";
      }


      if (n_data!=null &&
          n_data.length!==undefined && 
          n_data.length > 0) 
      {
        var str = "";
        //fill id_list
        for(var i=0; i < n_data.length; i++) 
        {
          id_list[n_data[i].s] = start_id+i+1;
        }


        for(var i=0; i < n_data.length; i++) 
        {
          var item = n_data[i];
          var item_num = start_id + item.n;
          str += "\
            <table class='docdata table'> \
              <thead> \
                <tr> \
                  <th width='40%'></th> \
                  <th width='60%'></th> \
                </tr> \
              </thead> \
              <tbody> \
                <tr class='major'><td>Statement Collection #"+item_num+"</td><td></td></tr> \
                ";
          str += this.format_id(item.s, id_list);

          var props = "";
          props += this.format_props(item.props, id_list, true);
          props += this.format_props(item.props, id_list, false);

          if (props.length > 0)
            str += "<tr class='major'> <td>"+this.PredName+"s</td><td></td> </tr>" + props;

          str += "\
              </tbody> \
            </table> \
                 ";
        }

        var tbl_start = "\
                <table> \
                  <tbody> \
                  ";
        var tbl_end = "\
                  </tbody> \
                </table> \
                ";
        if (str.length > 0)
           expanded = tbl_start + str + tbl_end;
      }
      return expanded;
    },


    format_props : function(props, id_list, only_rdf_type)
    {
      if (props=== undefined) 
        return "";
        
      var str = "";
      var self = this;
      $.each(props, function(key, val){
        if ((only_rdf_type && key!==self.ns.RDF_TYPE)
            || (!only_rdf_type && key===self.ns.RDF_TYPE))
          return;

        var key_str = key;
        var pref = self.ns.has_known_ns(key);
        var key_str = (pref!=null) ? self.pref_link(key, pref) : self.check_link(key, true);

        for(var i=0; i<val.length; i++) {
          var obj = val[i];
          if (obj.iri!==undefined) {
            var iri = obj.iri;
            var entity_id = id_list[iri];
            if (entity_id!==undefined && iri[0]==="_" && iri[1]===":") {
              str += "<tr class='data_row'><td>" + key_str + "</td><td class='major'><i>Statement Collection #" + entity_id + "</i></td></tr>";
            }
            else {
              var pref = self.ns.has_known_ns(obj.iri);
              var sval = (pref!=null) ? self.pref_link(obj.iri, pref) : self.check_link(obj.iri);
              str += "<tr class='data_row'><td>" + key_str + "</td><td>"+sval+"</td></tr>";
            }
          } 
          else {
            var v = obj.value;
            var sval;
            if (obj.type!==undefined && obj.type) {
              var pref = self.ns.has_known_ns(obj.type);
              if (pref)
                sval = self.check_link(v)+"("+self.pref_link(obj.type,pref)+")";
              else
                sval = self.check_link(v)+"("+self.check_link(obj.type)+")";
            }
            else if (obj.lang!==undefined && obj.lang!==null){
              sval = self.check_link(v)+"@"+obj.lang;
            } 
            else {
              sval = self.check_link(v);
            }
            str += "<tr class='data_row'><td>" + key_str + "</td><td>"+sval+"</td></tr>";
          }
        } 
      });
      return str;
    },

    format_id : function (value, id_list) 
    {
       var entity_id = id_list[value];
       if (entity_id!==undefined && value[0]==="_" && value[1]===":") {
         return "";
       }
       else {
         var pref = this.ns.has_known_ns(value);
         var sval = (pref!=null) ? this.pref_link(value, pref) : this.check_link(value);
         return "<tr class='major data_row'><td>"+this.SubjName+"</td><td>" + sval + "</td></tr>";
       }
    },

    check_link : function (val, is_key) 
    {
      if ( String(val).match(/^http(s)?:\/\//) ) {
        if ( String(val).match(/\.(jpg|png|gif)$/) ) {
          var width = (is_key!==undefined && is_key)?200:300;
          val = '<a href="' + val + '" title="' + val + '"><img src="' + val + '" style="max-width:'+width+'px;" /></a>';
        } else {
          val = '<a href="' + val + '">' + val + '</a>';
        }
      } else if ( String(val).match(/^mailto:/) ) {
        val = '<a href="' + val + '">' + val + '</a>';
      } else {
        val = this.pre(val);
      }
      return val;
    },


    pref_link : function (val, pref) 
    {
      var data = val.substring(pref.link.length);
      return '<a href="' + val + '" title="' + val + '">' + pref.ns+':'+data + '</a>';
    },

    pre : function (text) 
    {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

  }
