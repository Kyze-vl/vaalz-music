# Test sunucusunu 8799 portunda, pencere ve bekci olmadan baslatir:  python sunucu_test.py
import os, subprocess, sys
T = os.path.dirname(os.path.abspath(__file__)); KOK = os.path.dirname(os.path.dirname(T))
env = dict(os.environ, VAALZ_TEST="1", VAALZ_BASE=os.path.join(T, "vaalz-test"), VAALZ_WEB=os.path.join(KOK, "web"))
subprocess.run([sys.executable, os.path.join(KOK, "kaynak", "vaalzmusic.py")], env=env)
