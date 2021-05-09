function showHide( id, show ) {
  var ta = document.getElementById( id );
  ta.style.display = show ? "" : "none";
}

function log( t ) {
  var ta = document.getElementById( "log" );
  var d = new Date();
  var dd = d.toLocaleTimeString();
  ta.value = ta.value + "\n" + dd + ": " + t;
  ta.scrollTop = ta.scrollHeight;
  return dd;
}

function status( t ) {
  document.getElementById( "status" ).innerHTML = "Web MIDI status: " + t;
}

function nybbleChar( n ) {
  if ( n >= 10 ) {
    return String.fromCharCode( 'A'.charCodeAt( 0 ) + n - 10 );
  }
  return String.fromCharCode( '0'.charCodeAt( 0 ) + n );
}

function makeMsgSysEx() {
  var d = [0xF0, 0x00, 0x21, 0x27, 0x19, 0x02]
  var len = d.length
  var str = ""
  for ( var i = 0; i < len; ++i ) {
    str += String.fromCharCode( d[i] );
  }
  var text = "Hello!\nThis message\nwas sent from\nthe config tool.";
  str += text;
  str += String.fromCharCode( 0xF7 );
  return str;
}

function dumpSysex( data, id, prefix ) {
  var len = data.length
  var h = prefix
  for ( var i = 0; i < len; ++i ) {
    var b = data[ i ];
    h += nybbleChar( b >> 4 );
    h += nybbleChar( b & 0xf );
    h += " ";
    if ( ( i & 0xf ) === 0xf ) {
      h += "\n";
    }
  }
  document.getElementById( id ).value = h;
}

function parseMixShared( data, c ) {
  var ch, mix;
  for ( mix=0; mix<16; ++mix ) {
    for ( ch=0; ch<8; ++ch ) {
      var w = ( data[c] << 14 ) | ( data[c+1] << 7 ) | ( data[c+2] << 0 );
      c += 3;
      var v = w;
      var id = "mix" + mix + "_" + ch;
      document.getElementById( id ).value = w;
      updateMixText( mix, ch, v );
    }
  }
  return c;
}

function parseMixDump( data ) {
  var c = 0;
    c = parseMixShared( data, c );
    var i;
    for ( i=0; i<128; ++i ) {
      var v = data[c]; c++;
      var p = data[c]; c++;
      var mix = i >> 3;
      var ch = i & 7;
    var e = document.getElementById( "vmix" + mix + "_" + ch );
    if ( e != null ) {
      e.value = v;
      updateVMixText( mix, ch );
    }
    var e = document.getElementById( "vpan" + mix + "_" + ch );
    if ( e != null ) {
      e.value = p - 63;
      updateVPanText( mix, ch );
    }
    }
}

function parseUsage( data ) {
  var i;
  var u0 = 0, u1 = 0;
  var str0 = "", str1 = "";
  for ( i=0; i<4; ++i ) {
    var n0 = data[3-i];
    var n1 = data[7-i];
    str0 += nybbleChar( n0 );
    str1 += nybbleChar( n1 );
    u0 |= n0 << (4*(3-i));
    u1 |= n1 << (4*(3-i));
  }
  var str = str0 + " : " + str1 + '\n';
  str += u0 + " : " + u1;
  str += "  -  ";
  str += (4096-u0) + " : " + (4096-u1);
  str += "  -  ";
  str += ( ( u1 - u0 ) * 100.0 / (4096-u0) ).toFixed(1) + "%";
  document.getElementById( "rxSysex" ).value += ( "\n-----\n" + str );
}

function parseConfigDump( data ) {
  var dsp, ch, mix;
  // version
  var version = data[0];
  if ( version != 1 )
  {
    alert( "This version of the tool does not match the ES-9 firmware." );
    return;
  }
  // HPF
  var hpf = data[1];
    for ( ch=0; ch<7; ++ch ) {
    var id = "dc_" + (1+ch);
    document.getElementById( id ).checked = ( hpf & (1<<ch) );
  }
  // route in
  for ( dsp=0; dsp<4; ++dsp ) {
    for ( ch=0; ch<8; ++ch ) {
      var id = "cs" + dsp + "_" + ch;
      var t = document.getElementById( id );
      if ( t != null ) {
        var v = data[2+dsp*8+ch];
        if ( ( v >> 4 ) == 7 ) {
          v = 0x70 + inputCaptureLookup.indexOf( v );
        }
        t.value = v;
      }
    }
  }
  // route out
  for ( dsp=0; dsp<4; ++dsp ) {
    for ( ch=0; ch<8; ++ch ) {
      var id = "os" + dsp + "_" + ch;
      var t = document.getElementById( id );
      if ( t != null ) {
        t.value = data[2+32+dsp*8+ch];
      }
    }
  }
  // mix
    var c = 2+32+32;
    c = parseMixShared( data, c );
  var i;
    for ( i=0; i<16; ++i ) {
    updateMixTag( i );
    }
    for ( i=0; i<8; ++i ) {
    updateMixChTag( 2, i );
    updateMixChTag( 3, i );
  }
  // options
  var options = data[c]; c++;
  updateOptions( options );
  // links
  var links0 = 0;
  var links1 = 0;
    for ( i=0; i<4; ++i ) {
    links0 = ( links0 << 4 ) | data[c]; c++;
    }
    for ( i=0; i<4; ++i ) {
    links1 = ( links1 << 4 ) | data[c]; c++;
    }
    var links = ( links1 << 16 ) | links0;
    for ( i=0; i<7; ++i ) {
      document.getElementById( "link7_" + (2*i) ).checked = ( links >> i ) & 1;
    }
    for ( i=0; i<8; ++i ) {
      document.getElementById( "link6_" + (2*i) ).checked = ( links >> (8+i) ) & 1;
    }
    for ( i=0; i<4; ++i ) {
      document.getElementById( "link0_" + (2*i) ).checked = ( links >> (16+i) ) & 1;
      document.getElementById( "link1_" + (2*i) ).checked = ( links >> (20+i) ) & 1;
      document.getElementById( "link2_" + (2*i) ).checked = ( links >> (24+i) ) & 1;
      document.getElementById( "link3_" + (2*i) ).checked = ( links >> (28+i) ) & 1;
    }
    // midi channels
    document.getElementById( 'midi_ch_usb' ).value = data[c]; c++;
    document.getElementById( 'midi_ch_din' ).value = data[c]; c++;
    // dc offsets
    for ( i=0; i<8; ++i ) {
    var v = ( data[c] << 14 ) | ( data[c+1] << 7 ) | ( data[c+2] << 0 );
    v = ( v << 16 ) >> 16;
    c += 3;
    document.getElementById( "outDC_" + i ).value = v;
    updateOutDCText( i, v );
    }

  rebuildMixer();
}
