/*
Copyright (c) 2006, Gustavo Ribeiro Amigo
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    * Neither the name of the author nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Compile with mtasc:
mtasc -main SoundBridge.as -swf SoundBridge.swf -header 450:325:20 -v -version 8 -group

*/

import flash.external.ExternalInterface;

class SoundBridge
{
   static var app:SoundBridge;
   var sound:Sound;
   
   function SoundBridge() {
      SoundBridge.trace("SoundBridge created");
      
      this.sound = new Sound();
      this.sound.checkPolicyFile = true;
      
      ExternalInterface.addCallback("proxyMethods", this, proxyMethods);
      
      this.sound.onID3 = this.onID3;
      this.sound.onLoad = this.onLoad;
      this.sound.onSoundComplete = this.onSoundComplete;
   }
   
   function onLoad(success:Boolean) {
       SoundBridge.trace('soundBridge.onLoad event');
       ExternalInterface.call("Sound.onLoad", _root.id, success);
   } 
   
   function onSoundComplete() {
      SoundBridge.trace('soundBridge.onSoundComplete event');         
      ExternalInterface.call("Sound.onSoundComplete", _root.id);
   } 
   
   function onID3() {
      SoundBridge.trace('soundBridge.onID3 event');
      ExternalInterface.call("Sound.onID3", _root.id);      
   }
   
   
   function proxyMethods(propertie:String, args:Array):Object {
      var o:Object = this.sound[propertie];
      if (o instanceof Function) {
         var f:Function = this.sound[propertie];
         var returnObj:Object = f.apply(this.sound, args);
         SoundBridge.trace('SoundBridge: Called function ' + propertie + '(' + args + ') returning '+ returnObj);
         return returnObj;
      } else {
         SoundBridge.trace('SoundBridge: Called property ' + propertie + ' returning '+ o +'\n');
         return o;
      }
   }
   
   static function trace(value:String) {
      //if(_root.trace_tf == undefined) {
      //   _root.createTextField("trace_tf",0,0,0,450,325);
      //} 
      //_root.trace_tf.text += value + '\n';
      //ExternalInterface.call("Sound.trace", 'Flash: ' + value, false);   
   }
   
   static function main(mc:MovieClip) {
      app = new SoundBridge(); 
   }
}